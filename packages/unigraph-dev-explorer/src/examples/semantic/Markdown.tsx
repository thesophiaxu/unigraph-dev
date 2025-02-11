import { Typography } from '@material-ui/core';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkBreaks from 'remark-breaks';
import remarkWikilink from './wikilink';
import { DynamicViewRenderer } from '../../global.d';
import 'katex/dist/katex.min.css';

const compFactory = (
    name: string,
    { node, inline, className, children, ...props }: any,
) =>
    // eslint-disable-next-line react/no-children-prop
    React.createElement(name, {
        className,
        children,
        contentEditable: true,
        suppressContentEditableWarning: true,
        onPointerUp: (event: MouseEvent) => {
            if (!(event.target as HTMLElement).getAttribute('markdownPos')) {
                console.log(props.sourcePosition, window.getSelection());
                (event.target as HTMLElement).setAttribute(
                    'markdownPos',
                    String(
                        (props.sourcePosition?.start.column || 0) -
                            1 +
                            (window.getSelection()?.anchorOffset || 0),
                    ),
                );
            }
        },
        ...props,
        style: { ...props.style, display: 'contents' },
    });

export const Markdown: DynamicViewRenderer = ({
    data,
    callbacks,
    isHeading,
}) => {
    const MarkdownComponent = React.useMemo(() => {
        return (
            <Typography
                variant={!isHeading ? 'body1' : 'h4'}
                style={{
                    opacity: data['_value.%'] || isHeading ? 'unset' : '0',
                }}
            >
                <ReactMarkdown
                    // eslint-disable-next-line react/no-children-prop
                    children={
                        data['_value.%'] || (isHeading ? '_no title_' : '|')
                    }
                    remarkPlugins={[remarkMath, remarkWikilink, remarkBreaks]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                        p: compFactory.bind(this, 'p'),
                        strong: compFactory.bind(this, 'strong'),
                        em: compFactory.bind(this, 'em'),
                        code: compFactory.bind(this, 'code'),
                        ol: (props) =>
                            compFactory('ol', {
                                ...props,
                                inline: true,
                                style: { marginLeft: '8px' },
                            }),
                        a: (props) =>
                            compFactory('a', {
                                ...props,
                                onPointerUp: (ev: any) => {
                                    console.log(ev);
                                    ev.preventDefault();
                                    ev.stopPropagation();
                                },
                                target: '_blank',
                                style: { cursor: 'pointer' },
                            }),
                        // TODO: optimize this
                        // eslint-disable-next-line react/no-unstable-nested-components
                        span: ({
                            node,
                            inline,
                            className,
                            children,
                            ...props
                        }: any) => {
                            if (className?.includes('wikilink')) {
                                const matches = (
                                    callbacks?.['get-semantic-properties']?.()
                                        ?._value?.children?.['_value['] || []
                                ).filter(
                                    (el: any) =>
                                        el._key === `[[${children[0]}]]`,
                                );
                                const objDef =
                                    window.unigraph.getNamespaceMap?.()?.[
                                        matches[0]?._value?._value?.type?.[
                                            'unigraph.id'
                                        ]
                                    ];
                                return (
                                    <>
                                        <span style={{ color: 'darkgray' }}>
                                            [[
                                        </span>
                                        {objDef ? (
                                            <div
                                                style={{
                                                    display: 'inline-flex',
                                                    minWidth: '16px',
                                                    minHeight: '15px',
                                                    backgroundImage: `url("data:image/svg+xml,${objDef?._icon}")`,
                                                    opacity: 0.54,
                                                }}
                                            />
                                        ) : (
                                            []
                                        )}
                                        {
                                            // eslint-disable-next-line react/no-children-prop
                                            React.createElement('span', {
                                                className,
                                                children,
                                                contentEditable: true,
                                                suppressContentEditableWarning:
                                                    true,
                                                onPointerUp: (
                                                    event: MouseEvent,
                                                ) => {
                                                    event.stopPropagation();
                                                    event.preventDefault();
                                                    if (matches[0])
                                                        window.wsnavigator(
                                                            `/library/object?uid=${
                                                                matches[0]
                                                                    ._value
                                                                    ._value.uid
                                                            }&viewer=${'dynamic-view-detailed'}&type=${
                                                                matches[0]
                                                                    ._value
                                                                    ._value
                                                                    ?.type?.[
                                                                    'unigraph.id'
                                                                ]
                                                            }`,
                                                        );
                                                    else if (
                                                        callbacks?.namespaceLink
                                                    ) {
                                                        window.open(
                                                            callbacks.namespaceLink(
                                                                children[0],
                                                            ),
                                                            '_blank',
                                                        );
                                                    }
                                                },
                                                ...props,
                                                style: {
                                                    display: 'contents',
                                                    color:
                                                        matches[0] ||
                                                        callbacks?.namespaceLink
                                                            ? 'mediumblue'
                                                            : 'black',
                                                    ':hover': {
                                                        textDecoration:
                                                            'underline',
                                                    },
                                                    cursor: 'pointer',
                                                },
                                            })
                                        }
                                        <span style={{ color: 'darkgray' }}>
                                            ]]
                                        </span>
                                    </>
                                );
                            }
                            // eslint-disable-next-line react/no-children-prop
                            return React.createElement('span', {
                                className,
                                children,
                                inline,
                                node,
                                ...props,
                            });
                        },
                    }}
                    rawSourcePos
                />
            </Typography>
        );
    }, [
        data['_value.%'],
        JSON.stringify(
            callbacks?.['get-semantic-properties']?.()
                ?.map?.((el: any) => el?._value?.uid)
                .sort(),
        ),
    ]);

    return MarkdownComponent;
};
