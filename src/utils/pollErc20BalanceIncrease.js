import { ethers } from "ethers";

/**
 * Polls until balance increased by ~expectedAmount (human, 18 decimals) vs baseline.
 * Caller supplies `readBalance` — typically from createErc20BalanceReader.
 *
 * @param {bigint | null | undefined} [initialBaselineWei] — balance **before** payment (e.g. snapshot
 *   at checkout). If omitted, first read becomes baseline (fails if credit lands before 2nd poll).
 * @returns {() => void} cleanup to stop polling
 */
export function pollErc20BalanceIncrease({
  readBalance,
  expectedAmountHuman,
  initialBaselineWei,
  pollMs = 3500,
  timeoutMs = 10 * 60 * 1000,
  onSuccess,
  onTimeout,
}) {
  const expectedWei = ethers.parseEther(String(expectedAmountHuman));
  /** Dust + up to 1% slack for DEX / rounding vs quoted HDT amount */
  const toleranceWei =
    ethers.parseEther("0.0001") +
    (expectedWei >= 100n ? expectedWei / 100n : 0n);

  let cancelled = false;
  let baseline =
    initialBaselineWei !== undefined && initialBaselineWei !== null
      ? initialBaselineWei
      : null;
  let timeoutId = null;
  let intervalId = null;

  const stop = () => {
    cancelled = true;
    if (timeoutId != null) clearTimeout(timeoutId);
    if (intervalId != null) clearInterval(intervalId);
    timeoutId = null;
    intervalId = null;
  };

  const tick = async () => {
    if (cancelled) return;
    try {
      const bal = await readBalance();
      if (baseline === null) {
        baseline = bal;
        return;
      }
      const gained = bal - baseline;
      if (gained + toleranceWei >= expectedWei) {
        stop();
        onSuccess?.();
      }
    } catch (e) {
      console.error("pollErc20BalanceIncrease", e);
    }
  };

  void tick();
  intervalId = setInterval(tick, pollMs);

  timeoutId = setTimeout(() => {
    stop();
    onTimeout?.();
  }, timeoutMs);

  return stop;
}
