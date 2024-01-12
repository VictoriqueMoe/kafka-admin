export function removeObjectFromArray<T>(itemToRemove: T, arr: T[]): void {
    let arrLen = arr.length;
    while (arrLen--) {
        const currentItem = arr[arrLen];
        if (itemToRemove === currentItem) {
            arr.splice(arrLen, 1);
        }
    }
}
