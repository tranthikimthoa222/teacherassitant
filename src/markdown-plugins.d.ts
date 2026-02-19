declare module 'remark-math' {
    import { Plugin } from 'unified';
    const remarkMath: Plugin;
    export default remarkMath;
}

declare module 'remark-gfm' {
    import { Plugin } from 'unified';
    const remarkGfm: Plugin;
    export default remarkGfm;
}

declare module 'rehype-katex' {
    import { Plugin } from 'unified';
    const rehypeKatex: Plugin;
    export default rehypeKatex;
}
