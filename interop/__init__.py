"""
S4 Ledger — Interoperability Module
Protocol adapters for MIL-STD XML, ERP systems, gRPC stubs, and data transformation.

Components:
1. MIL-STD XML Parser — Parse/generate MIL-STD-1388 compliant XML
2. ERP/LTR Adapters — SAP, Oracle, Deltek interfaces
3. gRPC Service Definitions — High-performance binary protocol for system-to-system
4. Data Transformer — Normalize data between formats
"""

import json
import hashlib
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Optional


# ═══════════════════════════════════════════════════════════════════════
#  1. MIL-STD XML PARSER
# ═══════════════════════════════════════════════════════════════════════

class MILStdXMLParser:
    """
    Parse and generate MIL-STD-1388-2B / GEIA-STD-0007 compliant XML.
    Used for Logistics Support Analysis Record (LSAR) data exchange.
    """

    NAMESPACES = {
        "lsar": "urn:mil-std-1388-2b:lsar",
        "geia": "urn:geia-std-0007",
    }

    @staticmethod
    def parse_lsar_xml(xml_content: str) -> dict:
        """Parse LSAR XML into structured dict for S4 processing."""
        try:
            root = ET.fromstring(xml_content)
            records = []

            # Handle multiple possible root element patterns
            for element_tag in ["LSARecord", "Record", "Item", "lsar:Record"]:
                for record_elem in root.iter(element_tag):
                    record = {}
                    for child in record_elem:
                        tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                        record[tag] = child.text or ""
                    if record:
                        records.append(record)

            return {
                "status": "parsed",
                "format": "MIL-STD-1388-2B",
                "record_count": len(records),
                "records": records,
                "parsed_at": datetime.now(timezone.utc).isoformat(),
            }
        except ET.ParseError as e:
            return {"status": "error", "error": f"XML parse error: {str(e)}"}

    @staticmethod
    def generate_lsar_xml(records: list) -> str:
        """Generate MIL-STD compliant XML from S4 record data."""
        root = ET.Element("LSARDataExchange")
        root.set("xmlns", "urn:mil-std-1388-2b:lsar")
        root.set("version", "2B")
        root.set("generated", datetime.now(timezone.utc).isoformat())
        root.set("generator", "S4 Ledger v5.2.0")

        for record in records:
            record_elem = ET.SubElement(root, "LSARecord")
            for key, value in record.items():
                child = ET.SubElement(record_elem, key)
                child.text = str(value)

            # Always include hash for integrity verification
            record_hash = hashlib.sha256(
                json.dumps(record, sort_keys=True).encode()
            ).hexdigest()
            hash_elem = ET.SubElement(record_elem, "S4Hash")
            hash_elem.text = record_hash

        return ET.tostring(root, encoding="unicode", xml_declaration=True)

    @staticmethod
    def parse_wawf_xml(xml_content: str) -> dict:
        """Parse WAWF (Wide Area Workflow) invoice/receipt XML."""
        try:
            root = ET.fromstring(xml_content)
            result = {
                "document_type": root.tag,
                "fields": {},
            }
            for child in root:
                tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                result["fields"][tag] = child.text or ""
            return {"status": "parsed", "data": result}
        except ET.ParseError as e:
            return {"status": "error", "error": str(e)}


# ═══════════════════════════════════════════════════════════════════════
#  2. ERP / LTR ADAPTERS
# ═══════════════════════════════════════════════════════════════════════

class ERPAdapter:
    """
    Abstract adapter for Enterprise Resource Planning systems.
    Concrete implementations for SAP, Oracle, Deltek, etc.
    """

    def __init__(self, system_name: str, base_url: str = ""):
        self.system_name = system_name
        self.base_url = base_url
        self.connected = False

    def connect(self, credentials: dict) -> dict:
        """Establish connection to ERP system (stub)."""
        return {
            "system": self.system_name,
            "status": "stub_connected",
            "note": f"Production: OAuth2/SAML auth to {self.system_name} API",
        }

    def import_records(self, query: dict) -> dict:
        """Import records from ERP system (stub)."""
        return {
            "system": self.system_name,
            "status": "stub_import",
            "records": [],
            "note": f"Production: Queries {self.system_name} OData/REST API",
        }

    def export_anchor_proof(self, record_hash: str, tx_hash: str) -> dict:
        """Push anchor proof back to ERP system (stub)."""
        return {
            "system": self.system_name,
            "status": "stub_exported",
            "record_hash": record_hash,
            "tx_hash": tx_hash,
            "note": f"Production: POSTs proof to {self.system_name} webhook/API",
        }


class SAPAdapter(ERPAdapter):
    """SAP S/4HANA integration via OData V4 / RFC."""
    def __init__(self):
        super().__init__("SAP S/4HANA", "https://sap-host:443/sap/opu/odata4/")


class OracleAdapter(ERPAdapter):
    """Oracle Cloud SCM integration via REST API."""
    def __init__(self):
        super().__init__("Oracle Cloud SCM", "https://oracle-host/fscmRestApi/")


class DeltekAdapter(ERPAdapter):
    """Deltek Costpoint integration for defense contractors."""
    def __init__(self):
        super().__init__("Deltek Costpoint", "https://costpoint-host/api/")


# ═══════════════════════════════════════════════════════════════════════
#  3. DATA TRANSFORMER — Normalize between formats
# ═══════════════════════════════════════════════════════════════════════

class DataTransformer:
    """
    Transform data between S4 internal format and external systems.
    Supports: JSON ↔ XML, CSV → JSON, MIL-STD ↔ commercial formats.
    """

    @staticmethod
    def s4_to_cdrl(record: dict) -> dict:
        """Transform S4 record to CDRL (DD Form 1423) format."""
        return {
            "dd_form": "1423",
            "cdrl_sequence": record.get("sequence", "A001"),
            "data_item_title": record.get("record_label", ""),
            "di_number": record.get("di_number", ""),
            "contract_reference": record.get("contract", ""),
            "requiring_office": record.get("branch", "JOINT"),
            "frequency": record.get("frequency", "ASREQ"),
            "s4_hash": record.get("hash", ""),
            "s4_tx_hash": record.get("tx_hash", ""),
            "anchored": bool(record.get("tx_hash")),
            "timestamp": record.get("timestamp", ""),
        }

    @staticmethod
    def cdrl_to_s4(cdrl: dict) -> dict:
        """Transform CDRL data into S4 anchor format."""
        data_str = json.dumps(cdrl, sort_keys=True)
        return {
            "data": data_str,
            "record_type": "CDRL",
            "branch": cdrl.get("requiring_office", "JOINT"),
            "metadata": {
                "cdrl_sequence": cdrl.get("cdrl_sequence"),
                "di_number": cdrl.get("di_number"),
                "source_format": "DD1423",
            },
        }

    @staticmethod
    def normalize_nsn(raw: str) -> Optional[str]:
        """Normalize an NSN to standard format: XXXX-XX-XXX-XXXX."""
        import re
        digits = re.sub(r"[^0-9]", "", raw)
        if len(digits) == 13:
            return f"{digits[:4]}-{digits[4:6]}-{digits[6:9]}-{digits[9:13]}"
        return None

    @staticmethod
    def csv_to_records(csv_content: str, delimiter: str = ",") -> list:
        """Parse CSV content into list of record dicts."""
        import csv
        import io
        reader = csv.DictReader(io.StringIO(csv_content), delimiter=delimiter)
        return [dict(row) for row in reader]


# ═══════════════════════════════════════════════════════════════════════
#  4. gRPC SERVICE DEFINITIONS (stub — production uses .proto files)
# ═══════════════════════════════════════════════════════════════════════

GRPC_SERVICE_DEFINITION = """
// S4 Ledger gRPC Service Definition
// For high-performance system-to-system integration

syntax = "proto3";

package s4ledger.v1;

service AnchorService {
  // Anchor a single record hash to XRPL
  rpc Anchor(AnchorRequest) returns (AnchorResponse);
  
  // Batch anchor multiple records
  rpc BatchAnchor(BatchAnchorRequest) returns (BatchAnchorResponse);
  
  // Verify a record's integrity
  rpc Verify(VerifyRequest) returns (VerifyResponse);
  
  // Stream real-time anchor confirmations
  rpc StreamAnchors(StreamRequest) returns (stream AnchorEvent);
}

service ILSService {
  // Run gap analysis on uploaded data
  rpc AnalyzeGaps(GapAnalysisRequest) returns (GapAnalysisResponse);
  
  // Get supply chain risk score
  rpc ScoreRisk(RiskScoreRequest) returns (RiskScoreResponse);
  
  // Query AI agent
  rpc QueryAgent(AgentRequest) returns (AgentResponse);
}

message AnchorRequest {
  string data = 1;
  string record_type = 2;
  string branch = 3;
  map<string, string> metadata = 4;
}

message AnchorResponse {
  string status = 1;
  string hash = 2;
  string tx_hash = 3;
  string explorer_url = 4;
  double fee = 5;
  string timestamp = 6;
}

message BatchAnchorRequest {
  repeated AnchorRequest records = 1;
  bool use_merkle = 2;
}

message BatchAnchorResponse {
  string status = 1;
  string merkle_root = 2;
  string tx_hash = 3;
  int32 records_anchored = 4;
  repeated AnchorResponse results = 5;
}

message VerifyRequest {
  string hash = 1;
  string tx_hash = 2;
}

message VerifyResponse {
  string status = 1;
  bool hash_match = 2;
  bool tamper_detected = 3;
  string chain_hash = 4;
  string verified_at = 5;
}

message StreamRequest {
  string record_type_filter = 1;
  string branch_filter = 2;
}

message AnchorEvent {
  string hash = 1;
  string tx_hash = 2;
  string record_type = 3;
  string timestamp = 4;
}

message GapAnalysisRequest {
  bytes data = 1;
  string format = 2;  // csv, xlsx, json
  string framework = 3;  // MIL-STD-1388, CMMC, etc.
}

message GapAnalysisResponse {
  float compliance_score = 1;
  int32 total_items = 2;
  int32 gaps_found = 3;
  repeated Gap gaps = 4;
}

message Gap {
  string item = 1;
  string severity = 2;
  string recommendation = 3;
}

message RiskScoreRequest {
  string nsn = 1;
  float lead_time_days = 2;
  float unit_price = 3;
  int32 vendor_count = 4;
}

message RiskScoreResponse {
  string nsn = 1;
  int32 risk_score = 2;
  string risk_level = 3;
  repeated RiskFactor factors = 4;
}

message RiskFactor {
  string factor = 1;
  string severity = 2;
  string detail = 3;
  int32 score = 4;
}

message AgentRequest {
  string query = 1;
  string tool_context = 2;
  string session_id = 3;
}

message AgentResponse {
  string response = 1;
  string intent = 2;
  float confidence = 3;
  repeated Entity entities = 4;
}

message Entity {
  string type = 1;
  string value = 2;
  string label = 3;
}
"""


# ═══════════════════════════════════════════════════════════════════════
#  MODULE EXPORTS
# ═══════════════════════════════════════════════════════════════════════

xml_parser = MILStdXMLParser()
transformer = DataTransformer()

# ERP adapters
erp_adapters = {
    "sap": SAPAdapter(),
    "oracle": OracleAdapter(),
    "deltek": DeltekAdapter(),
}
