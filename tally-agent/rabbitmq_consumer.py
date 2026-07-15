"""
RabbitMQ Consumer - listens for sync messages and processes them.
"""

import json
import logging
import pika
from pika.exchange_type import ExchangeType
from .config import Config
from .exceptions import RabbitMQConnectionError, MessageProcessingError
from .models import SyncMessage, SyncResult
from .xml_generator import TallyXMLGenerator
from .tally_connector import TallyConnector
from .response_parser import TallyResponseParser
from .logger import logger


class RabbitMQConsumer:
    """Consumes messages from RabbitMQ and processes sync requests."""

    def __init__(self):
        self.host = Config.RABBITMQ_HOST
        self.port = Config.RABBITMQ_PORT
        self.user = Config.RABBITMQ_USER
        self.passwd = Config.RABBITMQ_PASS
        self.queue = Config.RABBITMQ_QUEUE
        self.exchange = Config.RABBITMQ_EXCHANGE
        self.routing_key = Config.RABBITMQ_ROUTING_KEY
        self.prefetch = Config.RABBITMQ_PREFETCH_COUNT

        self.xml_generator = TallyXMLGenerator()
        self.tally_connector = TallyConnector()
        self.response_parser = TallyResponseParser()

        self.connection = None
        self.channel = None

    def connect(self):
        """Establish RabbitMQ connection and channel."""
        credentials = pika.PlainCredentials(self.user, self.passwd)
        parameters = pika.ConnectionParameters(
            host=self.host,
            port=self.port,
            credentials=credentials,
            heartbeat=600,
            blocked_connection_timeout=300
        )
        try:
            self.connection = pika.BlockingConnection(parameters)
            self.channel = self.connection.channel()
            # Declare queue (durable)
            self.channel.queue_declare(queue=self.queue, durable=True)
            # Bind to exchange if provided
            if self.exchange:
                self.channel.exchange_declare(exchange=self.exchange, exchange_type=ExchangeType.direct, durable=True)
                self.channel.queue_bind(exchange=self.exchange, queue=self.queue, routing_key=self.routing_key)
            self.channel.basic_qos(prefetch_count=self.prefetch)
            logger.info(f"Connected to RabbitMQ. Consuming from queue: {self.queue}")
        except Exception as e:
            logger.error(f"RabbitMQ connection failed: {e}")
            raise RabbitMQConnectionError(f"Failed to connect to RabbitMQ: {e}")

    def start_consuming(self):
        """Start consuming messages."""
        if not self.channel:
            raise RabbitMQConnectionError("Channel not initialized. Call connect() first.")
        self.channel.basic_consume(
            queue=self.queue,
            on_message_callback=self._on_message,
            auto_ack=False
        )
        logger.info("Started consuming messages. Press CTRL+C to exit.")
        try:
            self.channel.start_consuming()
        except KeyboardInterrupt:
            logger.info("Stopped consuming by user.")
        except Exception as e:
            logger.error(f"Consumer error: {e}")
        finally:
            self.close()

    def _on_message(self, ch, method, properties, body):
        """Callback when a message is received."""
        message_id = None
        try:
            # Parse message
            raw_data = json.loads(body.decode('utf-8'))
            sync_msg = SyncMessage(**raw_data)
            message_id = sync_msg.message_id
            logger.info(f"Received message: {message_id}, operation: {sync_msg.operation}")

            # Process the sync
            result = self._process_sync(sync_msg)

            # Acknowledge message
            ch.basic_ack(delivery_tag=method.delivery_tag)

            # Optionally publish result to result queue
            self._publish_result(result)

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON message: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)
            # Reject and requeue if retry_count < max, else dead-letter or log
            # For simplicity, we'll requeue and rely on retry mechanism elsewhere.
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    def _process_sync(self, sync_msg: SyncMessage) -> SyncResult:
        """
        Process the sync message: generate XML, send to Tally, parse response.
        """
        try:
            # Generate XML
            xml_request = self.xml_generator.generate(
                sync_msg.operation,
                sync_msg.data.get("company_name", ""),  # Ensure company_name in data
                sync_msg.data
            )
            logger.debug(f"Generated XML for {sync_msg.operation}")

            # Send to Tally
            xml_response = self.tally_connector.send_request(xml_request)
            logger.debug(f"Received Tally response for {sync_msg.operation}")

            # Parse response
            parsed = self.response_parser.parse(xml_response)
            if parsed.get("success"):
                logger.info(f"Sync successful for {sync_msg.message_id}. Voucher No: {parsed.get('voucher_no')}")
                return SyncResult(
                    message_id=sync_msg.message_id,
                    success=True,
                    tally_response=xml_response,
                    tally_voucher_no=parsed.get("voucher_no")
                )
            else:
                error_msg = parsed.get("error", "Unknown Tally error")
                logger.error(f"Sync failed for {sync_msg.message_id}: {error_msg}")
                return SyncResult(
                    message_id=sync_msg.message_id,
                    success=False,
                    tally_response=xml_response,
                    error=error_msg
                )
        except Exception as e:
            logger.error(f"Sync processing error for {sync_msg.message_id}: {e}")
            return SyncResult(
                message_id=sync_msg.message_id,
                success=False,
                error=str(e)
            )

    def _publish_result(self, result: SyncResult):
        """Publish sync result to result queue (optional)."""
        if not Config.RESULT_QUEUE:
            return
        try:
            # Use a separate channel or reuse? For simplicity, reuse but ensure not blocking.
            # We'll declare result queue and publish.
            if self.channel:
                self.channel.queue_declare(queue=Config.RESULT_QUEUE, durable=True)
                self.channel.basic_publish(
                    exchange=Config.RESULT_EXCHANGE,
                    routing_key=Config.RESULT_ROUTING_KEY,
                    body=result.json().encode('utf-8'),
                    properties=pika.BasicProperties(delivery_mode=2)
                )
                logger.debug(f"Published result for {result.message_id}")
        except Exception as e:
            logger.error(f"Failed to publish result: {e}")

    def close(self):
        """Close connection."""
        if self.connection and not self.connection.is_closed:
            self.connection.close()
            logger.info("RabbitMQ connection closed.")