"""
Tally Prime Connector - sends XML requests and receives responses.
Uses HTTP XML interface on Tally Prime/ERP 9.
"""

import requests
import logging
from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception
from .config import Config
from .exceptions import TallyConnectionError, TallyResponseError

logger = logging.getLogger(__name__)


class TallyConnector:
    """Handles communication with Tally via HTTP XML."""

    def __init__(self):
        self.base_url = f"http://{Config.TALLY_HOST}:{Config.TALLY_PORT}"
        self.timeout = Config.TALLY_TIMEOUT
        self.retry_attempts = Config.TALLY_RETRY_ATTEMPTS
        self.retry_delay = Config.TALLY_RETRY_DELAY

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_fixed(2),
        retry=retry_if_exception(lambda e: isinstance(e, TallyConnectionError)),
        reraise=True
    )
    def send_request(self, xml_request: str) -> str:
        """
        Send XML request to Tally and return raw XML response.
        Raises TallyConnectionError or TallyResponseError.
        """
        headers = {"Content-Type": "text/xml"}
        try:
            logger.debug(f"Sending XML request to Tally: {xml_request[:200]}...")
            response = requests.post(
                self.base_url,
                data=xml_request,
                headers=headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            logger.debug(f"Received response from Tally: {response.text[:200]}...")
            return response.text
        except requests.exceptions.RequestException as e:
            logger.error(f"Tally request failed: {e}")
            raise TallyConnectionError(f"Failed to connect to Tally: {e}")
        except Exception as e:
            logger.error(f"Unexpected error during Tally request: {e}")
            raise TallyResponseError(f"Tally response error: {e}")