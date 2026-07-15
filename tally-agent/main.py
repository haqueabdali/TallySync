"""
Main entry point for the Tally Sync Agent.
"""

import sys
import signal
from sync_agent.logger import logger
from .rabbitmq_consumer import RabbitMQConsumer
from .exceptions import RabbitMQConnectionError

def signal_handler(sig, frame):
    logger.info("Received interrupt signal. Shutting down...")
    sys.exit(0)

def main():
    """Initialize and run the sync agent."""
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    consumer = RabbitMQConsumer()
    try:
        consumer.connect()
        consumer.start_consuming()
    except RabbitMQConnectionError as e:
        logger.error(f"RabbitMQ connection error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()