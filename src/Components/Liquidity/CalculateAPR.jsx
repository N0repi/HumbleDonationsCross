// CalculateAPR.jsx

async function APR() {
    const incentiveDurationInSeconds = decodedKey.endTime - decodedKey.startTime
    const incentiveDurationInDays = incentiveDurationInSeconds / (60 * 60 * 24)

    const calculateAPR = (rewardPerDay, totalLiquidity) => {
        const daysInYear = 365
        const apr = ((rewardPerDay * daysInYear) / totalLiquidity) * 100
        return apr.toFixed(2) // Format to 2 decimal places
    }
}
