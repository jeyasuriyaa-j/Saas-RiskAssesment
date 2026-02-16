declare module 'react-force-graph-2d' {
    import { Component } from 'react';
    export default class ForceGraph2D extends Component<any, any> {
        zoomToFit(duration?: number, padding?: number, nodeFilter?: (node: any) => boolean): void;
    }
}
