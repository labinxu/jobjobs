export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export function randomInteger(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
export const scrapeSleep = async () => {
    const sleepTime = randomInteger(4000, 20000);
    await sleep(sleepTime);
};

export function now() {
    let date, month, year;
    const inputDate = new Date();
    date = inputDate.getDate();
    month = inputDate.getMonth() + 1;
    year = inputDate.getFullYear();
    const hours = inputDate.getHours();
    const minutes = inputDate.getMinutes();
    const seconds = inputDate.getSeconds();
    date = date.toString().padStart(2, "0");
    month = month.toString().padStart(2, "0");

    return `${year}-${month}-${date}-${hours}-${minutes}-${seconds}`;
}
