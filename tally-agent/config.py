import os
import sys

# Try to load dotenv, but don't fail if unavailable
try:
    from dotenv import load_dotenv
    load_dotenv()  # Load .env file if present
except ImportError:
    # dotenv not installed; we'll rely on os.environ only
    pass

class Config:
    # RabbitMQ
    RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
    RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", 5672))
    RABBITMQ_USER = os.getenv("RABBITMQ_USER", "guest")
    RABBITMQ_PASS = os.getenv("RABBITMQ_PASS", "guest")
    RABBITMQ_QUEUE = os.getenv("RABBITMQ_QUEUE", "tally_sync_queue")
    RABBITMQ_EXCHANGE = os.getenv("RABBITMQ_EXCHANGE", "")
    RABBITMQ_ROUTING_KEY = os.getenv("RABBITMQ_ROUTING_KEY", "tally_sync")
    RABBITMQ_PREFETCH_COUNT = int(os.getenv("RABBITMQ_PREFETCH_COUNT", 1))

    # Tally
    TALLY_HOST = os.getenv("TALLY_HOST", "localhost")
    TALLY_PORT = int(os.getenv("TALLY_PORT", 9000))
    TALLY_TIMEOUT = int(os.getenv("TALLY_TIMEOUT", 30))
    TALLY_RETRY_ATTEMPTS = int(os.getenv("TALLY_RETRY_ATTEMPTS", 3))
    TALLY_RETRY_DELAY = int(os.getenv("TALLY_RETRY_DELAY", 2))

    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "sync_agent.log")

    # Result queue (optional)
    RESULT_QUEUE = os.getenv("RESULT_QUEUE", "tally_sync_result")
    RESULT_EXCHANGE = os.getenv("RESULT_EXCHANGE", "")
    RESULT_ROUTING_KEY = os.getenv("RESULT_ROUTING_KEY", "tally_sync_result")