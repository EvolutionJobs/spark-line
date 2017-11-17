import { html, svg, TemplateResult } from './node_modules/lit-html/lit-html.js';
import WithLit from './with-lit.js';
import StatLib from './stat-lib.js';

/** Data point on a sparkline. */
interface SparkPoint {
    /** X coördinate of the point. */
    x: number;

    /** Y coördinate of the point. */
    y: number;

    /** Original data point value. */
    d: number;
}

/** Render an array of data values as a simplified SVG chart 
 *
 * Styles:                        Default                   Description
 * --spark-line-fill              rgba(112, 112, 112, .1)   Fill under the sparkline, use rgba for opacity
 * --spark-line-stroke            rgba(112, 112, 112, 1)    Line colour
 * --spark-line-stroke-width      1px                       Line width
 * --spark-line-stroke-linejoin   round                     Line join style
 * --spark-line-stroke-linecap    round                     Line cap style
 * 
 * --spark-point-stroke           none                      Line around points
 * --spark-point-fill             rgba(112, 112, 112, .2)   Fill for points
 * --spark-point-hover-fill       gba(112, 112, 112, .8)    Alternate fill on hover
 * --spark-point-radius           2px                       Radius of each point
 * --spark-point-first-fill       --spark-point-fill        Alternate colour for the first point
 * --spark-point-first-radius     --spark-point-radius      Alternate radius for the first point
 * --spark-point-last-fill        rgba(112, 112, 112, .75)  Alternate colour for the last point, when same as prev
 * --spark-point-last-radius      --spark-point-radius      Alternate radius for the last point
 * --spark-point-last-up-fill     rgba(0, 220, 0, .75)      Alternate colour for the last point, when higher than prev
 * --spark-point-last-down-fill   rgba(220, 0, 0, .75)      Alternate colour for the last point, when lower than prev
 *                                                            
 * --spark-reference-line-stroke  rgba(255, 0, 0, .75)      Optional reference line colour
 * --spark-normal-band-fill       rgba(255, 0, 0, .1)       Optional normal band colour
 *                                
 * --spark-bar-fill               rgba(112, 112, 112, .3)   Fill for bar chart
 *
 */
export class SparkLine extends WithLit(HTMLElement) {

    private _data: number[];

    /** The data to display, must be set to render anything. */
    get data(): number[] { return this._data; };

    /** The data to display, must be set to render anything. */
    set data(d: number[]) {
        this._data = d;
        this.invalidate();
    };

    /** Optional limit, if set only this many items will be charted. */
    limit?: number;

    width: number = 240;
    height: number = 60;

    /* Scale the graphic content of the given element non-uniformly if necessary such that the element's bounding box exactly matches the viewport rectangle.
     * https://www.w3.org/TR/SVG/coords.html#PreserveAspectRatioAttribute */
    preserveAspectRatio: string = 'none';

    /** Optional maximum, if not set will be the highest value. */
    max?: number;

    /** Optional minimum, if not set will be the lowest value. */
    min?: number;

    /** The type of sparkline to display: line (default), bar, or both. */
    displayType: 'line' | 'bar' | 'both' = 'line';

    /** Reference line to display - statistical function to run across the values or a specific line. */
    referenceLine: 'none' | 'max' | 'min' | 'mean' | 'avg' | 'median' | 'stdev' | 'variance' | number = 'none';

    /** Whether to show a band around the standard deviation for the set. */
    normalBand: boolean = false;

    static get observedAttributes() { return ['data', 'limit', 'width', 'height', 'margin', 'min', 'max', 'reference-line', 'normal-band', 'display-type']; }

    attributeChangedCallback(attr: string, oldValue: any, newValue: any) {
        if (attr === 'limit' || attr === 'width' || attr === 'height' || attr === 'margin' || attr === 'min' || attr === 'max')
            (this as any)[attr] = newValue | 0;
        else if (attr === 'reference-line')
            this.referenceLine = newValue;
        else if (attr === 'normal-band')
            this.normalBand = true;
        else if (attr === 'display-type')
            this.displayType = newValue;
        else
            (this as any)[attr] = newValue;

        this.invalidate();
    }

    /** Get the factors to multiply raw values by to get the x and y points.
     * @param len The number of items, used to split the width into equat steps.
     * @param max The max value, any item with this value should get a y coörd that puts it at the top.
     * @param min The min value, any item with this value should get a y coörd that puts it at the bottom.
     * @returns x and y factors for the value and ordinal. */
    private getFactor(len: number, max: number, min: number): { x: number, y: number } {
        // Split the height by the difference from max to min
        const y = this.height / ((max - min) || 2);

        // Step along the x axis for each point
        const x = (this.width - 4) / (len - (len > 1 ? 1 : 0));

        return { x, y }
    }

    /** Get the data as coördinate points in the SVG chart. 
     * @returns Array of x, y and original value. */
    private getPoints(): SparkPoint[] {

        let len = this.data.length;
        let items = this.data;

        if (this.limit && this.limit < len) {
            items = this.data.slice(len - this.limit);
            len = this.limit;
        }

        const mx = this.max || Math.max(...items);
        const mn = this.min || Math.min(...items);

        const factors = this.getFactor(len, mx, mn);

        //const vfactor = height / ((max - min) || 2);

        //// Step along the x axis for each point
        //const hfactor = width / ((limit || len) - (len > 1 ? 1 : 0));

        return items.map((d, i) => ({
            x: i * factors.x,
            y: (mx === mn ? 1 : (mx - d)) * factors.y,
            d
        }));
    }

    /** Get the direction of the last 2 points.
     * @param points The array of points to chart.
     * @returns The direction of the last part of the line. */
    lastDirection(points: SparkPoint[]): 'up' | 'down' | 'same' {

        Math.sign = Math.sign || function (x) { return x > 0 ? 1 : -1; }
        if (points.length < 2)
            return 'same';

        const dir = Math.sign(points[points.length - 2].y - points[points.length - 1].y);
        if (dir < 0)
            return 'down';
        if (dir > 0)
            return 'up';

        return 'same';
    }

    renderReferenceLine(points: SparkPoint[]): TemplateResult {

        if (this.referenceLine === 'none')
            return html``;

        const ypoints = points.map(p => p.y);
        const parsed = parseFloat(this.referenceLine as any);
        const y = isNaN(parsed) ? StatLib.calc(this.referenceLine as any, ypoints) : parsed;

        return svg`<line class="spark-reference-line" x1=${points[0].x} y1=${y} x2=${points[points.length - 1].x} y2=${y} />`;
    }

    renderNormalBand(points: SparkPoint[]): TemplateResult {
        if (!this.normalBand)
            return html``;

        const ypoints = points.map(p => p.y);
        const dataMean = StatLib.mean(ypoints);
        const dataStdev = StatLib.stdev(ypoints);

        return svg`<rect class="spark-normal-band" x=${points[0].x} y=${dataMean - dataStdev} width=${points[points.length - 1].x - points[0].x} height=${dataStdev * 2} />`;
    }

    renderLine(points: SparkPoint[]): TemplateResult {
        if (this.displayType === 'bar')
            return html``;

        // Points to make up the spark line
        const linePoints = points.map(p => [p.x, p.y]).reduce((a, b) => a.concat(b));

        // Additional points to draw down to the bottom for the fill
        const closePolyPoints: number[] = [
            points[points.length - 1].x,
            this.height,
            0,
            this.height,
            0,
            points[0].y,
        ];

        const fillPoints = linePoints.concat(closePolyPoints);

        return svg`<g>
    <polyline class="spark-fill" points="${fillPoints.join(' ')}"></polyline>
    <polyline class="spark-line" points="${linePoints.join(' ')}"></polyline>
    ${points.map((p, i) => svg`
    <circle cx=${p.x} cy=${p.y} r=2 class="spark-point ${(i + 1 === points.length ? `direction-${this.lastDirection(points)}` : '')}">
        <title>${p.d}</title>
    </circle>`)}
</g>`;
    }

    renderBars(points: SparkPoint[]): TemplateResult {
        if (this.displayType === 'line')
            return html``;

        const barWidth: number = points && points.length >= 2 ? Math.max(0, points[1].x - points[0].x) : 0;

        return svg`<g transform="scale(1,-1)">
    ${points.map((p, i) => svg`<rect class="spark-bar" x=${p.x - barWidth / 2} y=${-this.height} width=${barWidth} height=${Math.max(0, this.height - p.y)} />`)}
</g>`;
    }

    render(): TemplateResult {
        if (!this.data || this.data.length === 0)
            return html``;

        const points = this.getPoints();
        //SparkLine.dataToPoints(
        //this.data, this.limit,
        //this.width, this.height,
        //this.max || Math.max(...this.data),
        //this.min || Math.min(...this.data));

        return html`
<style>
    :host{
        display: block;
    }

    circle.spark-point {
        stroke: var(--spark-point-stroke, none);
        stroke-width: 0;
        fill: var(--spark-point-fill, rgba(112, 112, 112, .2));
        pointer-events: auto;
        r: var(--spark-point-radius, 2px);
    }

    circle.spark-point:hover {
        fill: var(--spark-point-hover-fill, rgba(112, 112, 112, .8));
    }

    circle.spark-point:first-of-type {
        fill: var(--spark-point-first-fill, var(--spark-point-fill, rgba(112, 112, 112, .2)));
        r: var(--spark-point-first-radius, var(--spark-point-radius, 2px));
    }

    circle.spark-point:last-of-type {
        fill: var(--spark-point-last-fill, rgba(112, 112, 112, .75));
        r: var(--spark-point-last-radius, var(--spark-point-radius, 2px));
    }

    circle.spark-point.direction-up:last-of-type {
        fill: var(--spark-point-last-up-fill, rgba(0, 220, 0, .75));
    }

    circle.spark-point.direction-down:last-of-type {
        fill: var(--spark-point-last-down-fill, rgba(220, 0, 0, .75));
    }

    polyline.spark-fill {
        stroke: none;
        stroke-width: 0;
        fill: var(--spark-line-fill, rgba(112, 112, 112, .1));
    }

    polyline.spark-line{
        stroke: var(--spark-line-stroke, rgba(112, 112, 112, 1));
        stroke-width: var(--spark-line-stroke-width, 1px);
        stroke-linejoin: var(--spark-line-stroke-linejoin, round);
        stroke-linecap: var(--spark-line-stroke-linecap, round);
        fill: none;
    }

    line.spark-reference-line { 
        stroke: var(--spark-reference-line-stroke, rgba(255, 0, 0, .75));
        stroke-dasharray: 2, 2;
    }

    rect.spark-normal-band {
        fill: var(--spark-normal-band-fill, rgba(255, 0, 0, .1));
    }

    rect.spark-bar {
        fill: var(--spark-bar-fill, rgba(112, 112, 112, .3));
    }
</style> ${svg`
<svg viewBox="0 0 ${this.width} ${this.height}" width=${this.width} height=${this.height} preserveAspectRatio=${this.preserveAspectRatio}>
    <g>
        ${this.renderReferenceLine(points)}
        ${this.renderNormalBand(points)}
    </g>
    ${this.renderBars(points)}
    ${this.renderLine(points)}
</svg>`}`;
    }
}

customElements.define('spark-line', SparkLine);