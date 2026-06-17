export function createTradeLock() {
  let locked = false;

  return {
    isLocked() {
      return locked;
    },
    tryAcquire() {
      if (locked) return false;
      locked = true;
      return true;
    },
    release() {
      locked = false;
    },
  };
}
