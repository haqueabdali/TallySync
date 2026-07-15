"""
XML Generator for Tally requests.
Generates Tally XML request strings for various operations.
"""

import logging
from typing import Dict, Any
from lxml import etree
from .exceptions import XMLGenerationError
from .models import SyncOperation

logger = logging.getLogger(__name__)

class TallyXMLGenerator:
    """Generates Tally XML request bodies for HTTP XML interface."""

    def generate(self, operation: SyncOperation, company_name: str, data: Dict[str, Any]) -> str:
        """
        Generate XML for the given operation, company, and data.
        """
        if operation == SyncOperation.SALES_ORDER:
            body_xml = self._generate_voucher_xml("Sales Order", data)
        elif operation == SyncOperation.SALES_VOUCHER:
            body_xml = self._generate_voucher_xml("Sales", data)
        elif operation == SyncOperation.PURCHASE_VOUCHER:
            body_xml = self._generate_voucher_xml("Purchase", data)
        elif operation == SyncOperation.CREDIT_NOTE:
            body_xml = self._generate_voucher_xml("Credit Note", data)
        elif operation == SyncOperation.DEBIT_NOTE:
            body_xml = self._generate_voucher_xml("Debit Note", data)
        elif operation == SyncOperation.INVENTORY_SYNC:
            body_xml = self._generate_stock_item_xml(data)
        elif operation == SyncOperation.CUSTOMER_SYNC:
            body_xml = self._generate_ledger_xml(data)
        else:
            raise XMLGenerationError(f"Unsupported operation: {operation}")

        return self._create_envelope(company_name, body_xml)

    def _create_envelope(self, company_name: str, body_xml: str) -> str:
        """Wrap the inner XML in the Tally envelope."""
        return f"""<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
{body_xml}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>"""

    def _generate_voucher_xml(self, vch_type: str, data: Dict[str, Any]) -> str:
        """Generic voucher XML (Sales, Purchase, etc.)"""
        try:
            voucher = etree.Element("VOUCHER", VCHTYPE=vch_type, ACTION="Create")
            etree.SubElement(voucher, "DATE").text = data.get("voucher_date", "")
            etree.SubElement(voucher, "REFERENCENO").text = data.get("reference_no", "")
            etree.SubElement(voucher, "PARTYNAME").text = data.get("party_name", "")
            # Additional fields: NARRATION, etc.
            if "narration" in data:
                etree.SubElement(voucher, "NARRATION").text = data["narration"]

            # Ledger entries (items)
            items_elem = etree.SubElement(voucher, "ALLLEDGERENTRIES")
            for item in data.get("items", []):
                ledger_elem = etree.SubElement(items_elem, "LEDGER", NAME=item.get("item_name"))
                etree.SubElement(ledger_elem, "QUANTITY").text = str(item.get("quantity", 0))
                etree.SubElement(ledger_elem, "RATE").text = str(item.get("rate", 0))
                etree.SubElement(ledger_elem, "AMOUNT").text = str(item.get("amount", 0))
                # Optional: Godown, Batch, etc.

            return etree.tostring(voucher, pretty_print=True, encoding="unicode")
        except Exception as e:
            logger.error(f"Error generating voucher XML for {vch_type}: {e}")
            raise XMLGenerationError(f"Voucher XML generation failed: {e}")

    def _generate_stock_item_xml(self, data: Dict[str, Any]) -> str:
        """Stock item creation."""
        try:
            item = etree.Element("STOCKITEM", NAME=data.get("item_name", ""), ACTION="Create")
            etree.SubElement(item, "NAME").text = data.get("item_name", "")
            etree.SubElement(item, "BASEUNITS").text = data.get("unit", "Nos")
            etree.SubElement(item, "STANDARDRATE").text = str(data.get("standard_rate", 0))
            # Additional: opening balance, godown, etc.
            return etree.tostring(item, pretty_print=True, encoding="unicode")
        except Exception as e:
            logger.error(f"Error generating stock item XML: {e}")
            raise XMLGenerationError(f"Stock item XML generation failed: {e}")

    def _generate_ledger_xml(self, data: Dict[str, Any]) -> str:
        """Ledger (customer) creation."""
        try:
            ledger = etree.Element("LEDGER", NAME=data.get("customer_name", ""), ACTION="Create")
            etree.SubElement(ledger, "NAME").text = data.get("customer_name", "")
            etree.SubElement(ledger, "PARENT").text = data.get("group_name", "Sundry Debtors")
            etree.SubElement(ledger, "ADDRESS").text = data.get("address", "")
            etree.SubElement(ledger, "CITY").text = data.get("city", "")
            etree.SubElement(ledger, "STATE").text = data.get("state", "")
            etree.SubElement(ledger, "PINCODE").text = data.get("pincode", "")
            etree.SubElement(ledger, "EMAIL").text = data.get("email", "")
            etree.SubElement(ledger, "PHONE").text = data.get("phone", "")
            return etree.tostring(ledger, pretty_print=True, encoding="unicode")
        except Exception as e:
            logger.error(f"Error generating ledger XML: {e}")
            raise XMLGenerationError(f"Ledger XML generation failed: {e}")