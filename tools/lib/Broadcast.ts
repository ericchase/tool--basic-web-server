export type SubscriptionCallback<Value> = (value: Value, unsubscribe: () => void) => void;

export class Broadcast<Value> {
  protected subscriptionSet = new Set<SubscriptionCallback<Value>>();
  subscribe(callback: SubscriptionCallback<Value>) {
    this.subscriptionSet.add(callback);
    return () => {
      this.subscriptionSet.delete(callback);
    };
  }
  wait(untilValue: Value) {
    return new Promise<void>((resolve) => {
      const once = (value: Value) => {
        if (value === untilValue) {
          this.subscriptionSet.delete(once);
          resolve();
        }
      };
      this.subscriptionSet.add(once);
    });
  }
  send(value: Value) {
    for (const callback of this.subscriptionSet) {
      callback(value, () => {
        this.subscriptionSet.delete(callback);
      });
    }
  }
  sendAndWait(value: Value, untilValue: Value) {
    const promise = this.wait(untilValue);
    this.send(value);
    return promise;
  }
}
