"""
Parser for Tally XML responses.
Extracts status, error messages, and voucher numbers.
"""

import logging
from typing import Dict, Any
from xml.etree import ElementTree as ET
from .exceptions import TallyResponseError

logger = logging.getLogger(__name__)

class TallyResponseParser:
    """Parses Tally XML response."""

    def parse(self, xml_response: str) -> Dict[str, Any]:
        """
        Parse Tally response and return a dict with keys:
        - success: bool
        - message: str
        - voucher_no: Optional[str]
        - error: Optional[str]
        """
        try:
            root = ET.fromstring(xml_response)
        except ET.ParseError as e:
            logger.error(f"Failed to parse XML response: {e}")
            raise TallyResponseError(f"Invalid XML response from Tally: {e}")

        # Check for error nodes like <ERROR> or <LINEERROR>
        error_node = root.find(".//ERROR")
        if error_node is not None:
            error_msg = error_node.text or "Unknown Tally error"
            logger.error(f"Tally error: {error_msg}")
            return {"success": False, "error": error_msg, "voucher_no": None}

        # Check for success indicators
        # Often Tally returns <RESPONSE> with <STATUS> or <VOUCHERNUMBER>
        status_node = root.find(".//STATUS")
        if status_node is not None and status_node.text == "0":
            # 0 often indicates success
            voucher_no_node = root.find(".//VOUCHERNUMBER")
            voucher_no = voucher_no_node.text if voucher_no_node is not None else None
            return {"success": True, "message": "Success", "voucher_no": voucher_no}
        elif status_node is not None and status_node.text != "0":
            return {"success": False, "error": f"Tally status code: {status_node.text}", "voucher_no": None}
        else:
            # Check for <LINEERROR> or <ERROR> in deeper nodes
            line_error = root.find(".//LINEERROR")
            if line_error is not None:
                return {"success": False, "error": line_error.text, "voucher_no": None}
            # If no error, assume success but log warning
            logger.warning("No explicit status or error in Tally response. Assuming success.")
            return {"success": True, "message": "Assumed success", "voucher_no": None}