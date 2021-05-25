/**
 * This file specifies related common abstractions when developing front-end apps using React.
 * Users can import this file and use its helper libraries for their own React apps without
 * importing unigraph-dev-explorer.
 * 
 * For some sample usages, see the examples folder in unigraph-dev-explorer.
 */
import React from "react"
import { UnigraphContext, UnigraphHooks } from "../types/unigraph";
import { getRandomInt } from './unigraph';

export function withUnigraphSubscription(WrappedComponent: React.FC<{data: any}>, 
    unigraphContext: UnigraphContext, unigraphHooks: UnigraphHooks): React.FC {

    return (props) => {
        const [subsId, setSubsId] = React.useState(getRandomInt());
        const [data, setData] = React.useState(unigraphContext.defaultData);

        const init = async () => {
            Promise.all([
                ...unigraphContext.schemas.map(el => (window as any).unigraph.ensureSchema(el.name, el.schema)),
                ...unigraphContext.packages.map(el => (window as any).unigraph.ensurePackage(el.pkgManifest.package_name, el))
            ]).then(unigraphHooks.afterSchemasLoaded(subsId, data, setData))
        }

        React.useEffect(() => {
            // Ensure schema is present
            init();

            return function cleanup() {
                (window as any).unigraph.unsubscribe(subsId);
            };
        }, []);

        return <WrappedComponent {...props} data={data}/>
    }

}

export const registerDynamicViews = (views: Record<string, React.FC>) => {
    Object.entries(views).forEach(([k, v]) => (window as any).DynamicViews ? (window as any).DynamicViews[k] = v : null)
}

export const registerDetailedDynamicViews = (views: Record<string, React.FC>) => {
    Object.entries(views).forEach(([k, v]) => (window as any).DynamicViewsDetailed ? (window as any).DynamicViewsDetailed[k] = v : null)
}