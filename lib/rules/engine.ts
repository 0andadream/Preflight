import { isAddressEqual, zeroAddress } from "viem";
import { DEFAULT_ASSUMPTIONS, isDeadDvn, shortAddress } from "@/lib/layerzero/networks";
import type {
  ExpectedAssumptions,
  ObservedConfig,
  RuleResult,
  RuleStatus,
  Severity,
  TransactionIntent,
} from "@/types";

function rule(
  id: string,
  name: string,
  status: RuleStatus,
  severity: Severity,
  expected: string,
  actual: string,
  explanation: string,
): RuleResult {
  return { id, name, status, severity, expected, actual, explanation };
}

function sameAddr(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  try {
    return isAddressEqual(a as `0x${string}`, b as `0x${string}`);
  } catch {
    return a.toLowerCase() === b.toLowerCase();
  }
}

export function evaluateSecurityRules(
  observed: ObservedConfig,
  expected: ExpectedAssumptions = DEFAULT_ASSUMPTIONS,
  intent?: TransactionIntent,
): RuleResult[] {
  return [
    dvnConfiguration(observed, expected),
    dvnThreshold(observed, expected),
    sendLibrary(observed, expected),
    receiveLibrary(observed, expected),
    executor(observed, expected),
    confirmations(observed, expected),
    owner(observed, expected),
    adminDelegate(observed),
    peerConfiguration(observed, expected, intent),
    endpointConfiguration(observed, expected),
    supportedDestination(observed, intent),
    oftConfiguration(observed, expected, intent),
  ];
}

export function dvnConfiguration(observed: ObservedConfig, expected: ExpectedAssumptions): RuleResult {
  const names = observed.requiredDvns.map((d) => d.name).join(", ") || "none";
  const dead = observed.requiredDvns.filter((d) => isDeadDvn(d.address));
  const unknown = observed.requiredDvns.filter((d) => d.name.startsWith("0x") || d.name.includes("…"));

  if (expected.forbidDeadDvn && dead.length > 0) {
    return rule(
      "dvn_configuration",
      "DVN Configuration",
      "FAIL",
      "CRITICAL",
      "Required DVNs must be live, independent verifiers",
      `${names} (includes Dead DVN)`,
      "A Dead DVN can never attest. Messages on this pathway will not verify.",
    );
  }

  if (observed.requiredDvnCount === 0 || observed.requiredDvns.length === 0) {
    return rule(
      "dvn_configuration",
      "DVN Configuration",
      "FAIL",
      "CRITICAL",
      "At least one required DVN pinned on the pathway",
      "No required DVNs",
      "The security stack has no required verifiers. Any single compromised optional path can forge messages.",
    );
  }

  if (unknown.length > 0) {
    return rule(
      "dvn_configuration",
      "DVN Configuration",
      "WARN",
      "MEDIUM",
      "Known, independent DVN operators",
      names,
      "One or more required DVNs are not in the known operator directory.",
    );
  }

  return rule(
    "dvn_configuration",
    "DVN Configuration",
    "PASS",
    "CRITICAL",
    "Live required DVNs from known operators",
    names,
    "Required DVNs are present and do not include a Dead DVN.",
  );
}

export function dvnThreshold(observed: ObservedConfig, expected: ExpectedAssumptions): RuleResult {
  const total = Math.max(expected.minRequiredDvns, observed.requiredDvns.length, observed.requiredDvnCount);
  const actual = `${observed.requiredDvnCount} / ${total}`;
  const want = `${expected.minRequiredDvns} / ${expected.minRequiredDvns}`;

  if (observed.requiredDvnCount < expected.minRequiredDvns) {
    return rule(
      "dvn_threshold",
      "DVN Threshold",
      "FAIL",
      "CRITICAL",
      want,
      actual,
      `Required DVN threshold dropped below the agent's assumed ${want} security stack.`,
    );
  }

  if (observed.requiredDvnCount === 1) {
    return rule(
      "dvn_threshold",
      "DVN Threshold",
      "FAIL",
      "CRITICAL",
      want,
      actual,
      "A 1-of-N required DVN stack means a single verifier compromise forges the pathway.",
    );
  }

  return rule(
    "dvn_threshold",
    "DVN Threshold",
    "PASS",
    "CRITICAL",
    `≥ ${want}`,
    actual,
    "Required DVN threshold meets the agent's security assumption.",
  );
}

export function sendLibrary(observed: ObservedConfig, expected: ExpectedAssumptions): RuleResult {
  const ok = sameAddr(observed.sendLibrary, expected.expectedSendLibrary);
  return rule(
    "send_library",
    "Send Library",
    ok ? "PASS" : "FAIL",
    "HIGH",
    shortAddress(expected.expectedSendLibrary) + " (SendUln302)",
    shortAddress(observed.sendLibrary),
    ok
      ? "Send library is the official SendUln302 on X Layer."
      : "Send library differs from the official SendUln302. Outbound verification semantics may have changed.",
  );
}

export function receiveLibrary(observed: ObservedConfig, expected: ExpectedAssumptions): RuleResult {
  const ok = sameAddr(observed.receiveLibrary, expected.expectedReceiveLibrary);
  if (!ok) {
    return rule(
      "receive_library",
      "Receive Library",
      "FAIL",
      "HIGH",
      shortAddress(expected.expectedReceiveLibrary) + " (ReceiveUln302)",
      shortAddress(observed.receiveLibrary),
      "Receive library is not the official ReceiveUln302. Inbound verification may not match the send side.",
    );
  }
  if (observed.receiveLibraryIsDefault) {
    return rule(
      "receive_library",
      "Receive Library",
      "WARN",
      "LOW",
      "Pinned ReceiveUln302",
      `${shortAddress(observed.receiveLibrary)} (default)`,
      "Library address is ReceiveUln302 but inherited from the mutable default. A default rotation can drift the pathway.",
    );
  }
  return rule(
    "receive_library",
    "Receive Library",
    "PASS",
    "HIGH",
    "Pinned ReceiveUln302",
    shortAddress(observed.receiveLibrary),
    "Receive library is the official ReceiveUln302.",
  );
}

export function executor(observed: ObservedConfig, expected: ExpectedAssumptions): RuleResult {
  const ok = sameAddr(observed.executor, expected.expectedExecutor);
  if (!observed.executor || sameAddr(observed.executor, zeroAddress)) {
    return rule(
      "executor",
      "Executor",
      "WARN",
      "MEDIUM",
      shortAddress(expected.expectedExecutor) + " (LZ Executor)",
      "unset",
      "No executor is configured. Delivery is permissionless but automatic execution is not guaranteed.",
    );
  }
  return rule(
    "executor",
    "Executor",
    ok ? "PASS" : "WARN",
    "MEDIUM",
    shortAddress(expected.expectedExecutor) + " (LZ Executor)",
    shortAddress(observed.executor),
    ok
      ? "Executor is the official LayerZero executor on X Layer."
      : "Executor is not the official LayerZero executor. Execution still does not change verification.",
  );
}

export function confirmations(observed: ObservedConfig, expected: ExpectedAssumptions): RuleResult {
  const ok = observed.confirmations >= expected.minConfirmations;
  return rule(
    "confirmations",
    "Confirmations",
    ok ? "PASS" : "FAIL",
    "HIGH",
    `≥ ${expected.minConfirmations} source blocks`,
    `${observed.confirmations}`,
    ok
      ? "Required source confirmations meet the agent's finality assumption."
      : "Required confirmations are below the agent's finality assumption. Reorg risk is higher.",
  );
}

export function owner(observed: ObservedConfig, expected: ExpectedAssumptions): RuleResult {
  if (!expected.ownerMustBeSet) {
    return rule("owner", "Owner", "PASS", "HIGH", "Set", observed.owner ?? "—", "Owner check disabled.");
  }
  if (!observed.owner || sameAddr(observed.owner, zeroAddress)) {
    return rule(
      "owner",
      "Owner",
      "FAIL",
      "HIGH",
      "Non-zero owner",
      "unset",
      "OFT owner is unset. Configuration authority is unclear.",
    );
  }
  return rule(
    "owner",
    "Owner",
    "PASS",
    "HIGH",
    "Non-zero owner",
    shortAddress(observed.owner),
    "OFT owner is set and readable on X Layer.",
  );
}

export function adminDelegate(observed: ObservedConfig): RuleResult {
  if (!observed.delegate || sameAddr(observed.delegate, zeroAddress)) {
    return rule(
      "admin_delegate",
      "Admin / Delegate",
      "WARN",
      "LOW",
      "Delegate set on the endpoint",
      "unset",
      "No endpoint delegate is recorded. Only the owner can change pathway config.",
    );
  }
  return rule(
    "admin_delegate",
    "Admin / Delegate",
    "PASS",
    "LOW",
    "Delegate set",
    shortAddress(observed.delegate),
    "Endpoint delegate is set.",
  );
}

export function peerConfiguration(
  observed: ObservedConfig,
  expected: ExpectedAssumptions,
  intent?: TransactionIntent,
): RuleResult {
  const dest = intent?.destinationChain ?? "destination";
  if (!expected.destinationMustBePeer) {
    return rule("peer_configuration", "Peer Configuration", "PASS", "HIGH", "Peer optional", "skipped", "");
  }
  if (!observed.peerConfigured) {
    return rule(
      "peer_configuration",
      "Peer Configuration",
      "FAIL",
      "HIGH",
      `Peer set for ${dest} (EID ${observed.destinationEid})`,
      "not configured",
      `No peer is configured for ${dest}. The OFT cannot send to that destination.`,
    );
  }
  return rule(
    "peer_configuration",
    "Peer Configuration",
    "PASS",
    "HIGH",
    `Peer set for ${dest}`,
    observed.peer ? shortAddress(observed.peer) : "configured",
    `Destination peer for ${dest} is configured.`,
  );
}

export function endpointConfiguration(observed: ObservedConfig, expected: ExpectedAssumptions): RuleResult {
  const ok = sameAddr(observed.endpoint, expected.expectedEndpoint);
  return rule(
    "endpoint_configuration",
    "Endpoint Configuration",
    ok ? "PASS" : "FAIL",
    "CRITICAL",
    `${shortAddress(expected.expectedEndpoint)} · X Layer EID ${observed.sourceEid}`,
    shortAddress(observed.endpoint),
    ok
      ? "OApp is wired to the official LayerZero Endpoint V2 on X Layer."
      : "Endpoint address is not the official X Layer Endpoint V2.",
  );
}

export function supportedDestination(observed: ObservedConfig, intent?: TransactionIntent): RuleResult {
  const dest = intent?.destinationChain ?? "unknown";
  const supported = observed.destinationEid > 0;
  return rule(
    "supported_destination",
    "Supported Destination",
    supported ? "PASS" : "FAIL",
    "HIGH",
    "Known LayerZero destination EID",
    supported ? `${dest} · EID ${observed.destinationEid}` : dest,
    supported
      ? `${dest} is a configured LayerZero destination.`
      : "Destination is not a known LayerZero endpoint in this deployment.",
  );
}

export function oftConfiguration(
  observed: ObservedConfig,
  expected: ExpectedAssumptions,
  intent?: TransactionIntent,
): RuleResult {
  const token = (intent?.token ?? observed.tokenSymbol).toUpperCase();
  const ok = sameAddr(observed.tokenAddress, expected.expectedTokenAddress);
  return rule(
    "oft_configuration",
    "OFT Configuration",
    ok ? "PASS" : "WARN",
    "MEDIUM",
    `USDT0 @ ${shortAddress(expected.expectedTokenAddress)}`,
    `${token} @ ${shortAddress(observed.tokenAddress)}`,
    ok
      ? "Asset resolves to the canonical USDT0 OFT on X Layer."
      : "Asset address does not match the canonical USDT0 OFT on X Layer.",
  );
}
