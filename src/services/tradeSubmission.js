export async function resetAmountAfterSubmission(submission, resetAmount) {
  try {
    return await submission;
  } finally {
    resetAmount();
  }
}
