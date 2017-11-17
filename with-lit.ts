import { render, html, TemplateResult } from './node_modules/lit-html/lit-html.js';

/** Extend an element to have helper methods for lit-html.
 * @param Base The element to extend.
 * @returns The extended element. */
export function WithLit<T extends Constructor<Element>>(Base: T) {
    return class extends Base {
        /** Holds whether the render is already queued. */
        private needsRender: boolean = false;

        /** Render lit-html content in the shadow root of this element.
         * @returns The root template. */
        render(): TemplateResult { return html`` };

        /** The callback to render the lit-html result. */
        private renderCallback() : void {
            render(this.render(), this.shadowRoot || this.attachShadow({ mode: 'open' }));
        }

        /** Call to invalidate the current element and refresh on the next frame. */
        async invalidate(): Promise<void> {
            if (this.needsRender)
                return;

            this.needsRender = true;
            // Schedule the following as micro task, which runs before requestAnimationFrame. All additional invalidate() calls before will be ignored.
            // https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/
            this.needsRender = await false;
            this.renderCallback();
        }

        connectedCallback() {
            this.invalidate();
        }
    }
}

export default WithLit;