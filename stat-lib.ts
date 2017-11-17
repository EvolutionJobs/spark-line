/** Statistical functions across values */
export default class StatLib {
    /** Get the max value of a numeric array
     * @param data The array of numbers to get the max of
     * @returns The maximum value of the array */
    static max(data: number[]): number { return Math.max(...data); }

    /** Get the min value of a numeric array
     * @param data The array of numbers to get the min of
     * @returns The minimum value of the array */
    static min(data: number[]): number { return Math.min(...data); }

    /** Get the mean average value of a numeric array
     * @param data The array of numbers to get the mean of
     * @returns The mean value of the array */
    static mean(data: number[]): number { return data.reduce((a, b) => a + b) / data.length; }

    /** Get the median value of a numeric array
     * @param data The array of numbers to get the median of
     * @returns The median value of the array */
    static median(data: number[]): number { return data.sort((a, b) => a - b)[Math.floor(data.length / 2)]; }

    /** Get the midpoint value of a numeric array
     * @param data The array of numbers to get the midpoint of
     * @returns The midpoint value of the array */
    static midpoint(data: number[]): number { return StatLib.max(data) - StatLib.min(data) / 2; }

    /** Get the standard deviation value of a numeric array
     * @param data The array of numbers to get the standard deviation of
     * @returns The standard deviation value of the array */
    static stdev(data: number[]): number {
        const dataMean = StatLib.mean(data);
        const sqDiff = data.map(n => Math.pow(n - dataMean, 2));
        const avgSqDiff = StatLib.mean(sqDiff);
        return Math.sqrt(avgSqDiff);
    }

    /** Get the variance value of a numeric array
     * @param data The array of numbers to get the variance of
     * @returns The variance value of the array */
    static variance(data: number[]): number {
        const dataMean = StatLib.mean(data);
        const sq = data.map(n => Math.pow(n - dataMean, 2));
        return StatLib.mean(sq);
    }

    /** Get the value of the named statistic.
     * @param fx The name of the statistic to get.
     * @param data The array of numbers to get the stat of
     * @returns The calculated statistic of the array */
    static calc(fx: 'max' | 'min' | 'mean' | 'avg' | 'median' | 'stdev' | 'variance', data: number[]): number {
        return (StatLib as any)[fx](data);
    }
}