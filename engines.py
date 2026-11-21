from typing import Any, Dict, List, Tuple
import networkx as nx
from rapidfuzz import fuzz


class EvidenceKnowledgeGraph:
    """NetworkX MultiDiGraph storing documents, entities, claims, and provenance edges."""

    def __init__(self) -> None:
        self.graph = nx.MultiDiGraph()

    def add_entity(self, node_id: str, **attrs: Any) -> None:
        self.graph.add_node(node_id, **attrs)

    def add_provenance_edge(
        self,
        source: str,
        target: str,
        relationship: str,
        source_document_id: str,
        source_page: int,
        extracted_record_id: str,
        matching_method: str,
        match_rationale: str,
        verification_status: str,
        **extra: Any,
    ) -> None:
        self.graph.add_edge(
            source,
            target,
            relationship=relationship,
            sourceDocumentId=source_document_id,
            sourcePage=source_page,
            extractedRecordId=extracted_record_id,
            matchingMethod=matching_method,
            matchRationale=match_rationale,
            verificationStatus=verification_status,
            **extra,
        )

    def detect_isolated_records(self) -> List[str]:
        return list(nx.isolates(self.graph))

    @staticmethod
    def candidate_entity_match(
        name_a: str,
        name_b: str,
        identifier_match: bool = False,
        context_overlap: bool = False,
    ) -> Tuple[float, bool, str]:
        """
        RapidFuzz candidate matching. Never auto-merges based on name similarity alone;
        requires business identifier or financial context confirmation.
        """
        score = float(fuzz.token_sort_ratio(name_a, name_b))
        auto_merge = score >= 92.0 and (identifier_match or context_overlap)
        status = "MATCH_VERIFIED" if auto_merge else "REQUIRES_MANUAL_VERIFICATION"
        return score, auto_merge, status


class FinancialTransactionGraph:
    """Dedicated Payer -> Receiver directed multigraph with bounded cycle detection."""

    def __init__(self) -> None:
        self.graph = nx.MultiDiGraph()

    def add_transfer(
        self,
        payer_id: str,
        receiver_id: str,
        txn_id: str,
        amount: float,
        currency: str,
        date: str,
        source_document_id: str,
        verification_status: str,
        description: str = "",
    ) -> None:
        self.graph.add_edge(
            payer_id,
            receiver_id,
            transactionId=txn_id,
            amount=amount,
            currency=currency,
            date=date,
            sourceDocumentId=source_document_id,
            verificationStatus=verification_status,
            description=description,
        )

    def detect_circular_paths(self, max_length: int = 4, max_cycles: int = 25) -> List[List[str]]:
        """
        Uses NetworkX simple_cycles with explicit length and result caps to prevent
        exponential blowup on large graphs. Circular paths are investigation signals only.
        """
        if self.graph.number_of_nodes() > 500:
            return []
        simple_digraph = nx.DiGraph(self.graph)
        found: List[List[str]] = []
        for cycle in nx.simple_cycles(simple_digraph, length_bound=max_length):
            if len(cycle) >= 2:
                found.append(cycle + [cycle[0]])
                if len(found) >= max_cycles:
                    break
        return found


def build_kaveri_demo_transaction_graph() -> FinancialTransactionGraph:
    g = FinancialTransactionGraph()
    g.add_transfer("BUS-KAVERI", "SUP-CAUVERY", "TXN-8819", 10000.0, "INR", "2026-11-13", "DOC002", "POSSIBLE_ANOMALY", "Kaveri Textiles -> Cauvery Dyeing Mills")
    g.add_transfer("SUP-CAUVERY", "SUP-TRICHY", "ADV-409", 9500.0, "INR", "2026-11-13", "DOC008", "POSSIBLE_ANOMALY", "Cauvery Dyeing Mills -> Trichy Yarn Traders")
    g.add_transfer("SUP-TRICHY", "BUS-KAVERI", "TXN-8824", 9000.0, "INR", "2026-11-14", "DOC002", "POSSIBLE_ANOMALY", "Trichy Yarn Traders -> Kaveri Textiles")
    g.add_transfer("CUST-KUMAR", "BUS-KAVERI", "TXN-8841", 20000.0, "INR", "2026-11-16", "DOC002", "CONTRADICTED", "INV001 payment shortfall")
    g.add_transfer("CUST-SELVAM", "BUS-KAVERI", "TXN-8810", 142000.0, "INR", "2026-11-12", "DOC002", "CORROBORATED", "INV004 full payment")
    g.add_transfer("CUST-MURUGAN", "BUS-KAVERI", "LEDGER-P14-1", 18500.0, "INR", "2026-11-18", "DOC004", "REQUIRES_MANUAL_REVIEW", "Handwritten ledger cash receipt")
    g.add_transfer("BUS-KAVERI", "LEND-SIDBI", "TXN-8802", 38500.0, "INR", "2026-11-10", "DOC006", "CORROBORATED", "SIDBI monthly EMI")
    return g


def compute_deterministic_layout(graph: nx.MultiDiGraph) -> Dict[str, Dict[str, float]]:
    """Returns deterministic seeded NetworkX coordinates for Cytoscape.js preset rendering."""
    raw = nx.spring_layout(graph, seed=42, scale=420)
    return {
        node_id: {"x": round(float(coords[0]), 2), "y": round(float(coords[1]), 2)}
        for node_id, coords in raw.items()
    }
