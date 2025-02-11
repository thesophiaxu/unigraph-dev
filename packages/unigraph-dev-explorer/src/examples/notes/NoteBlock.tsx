/* eslint-disable no-param-reassign */
import { setRef, Typography } from '@material-ui/core';
import React, { FormEvent } from 'react';
import {
    byElementIndex,
    unpad,
} from 'unigraph-dev-common/lib/utils/entityUtils';
import _ from 'lodash';
import { buildGraph, getRandomInt } from 'unigraph-dev-common/lib/utils/utils';
import { Actions } from 'flexlayout-react';
import { FiberManualRecord, MoreVert } from '@material-ui/icons';
import stringify from 'json-stable-stringify';
import { AutoDynamicView } from '../../components/ObjectView/AutoDynamicView';
import { ViewViewDetailed } from '../../components/ObjectView/DefaultObjectView';

import {
    addChild,
    convertChildToTodo,
    focusLastDFSNode,
    focusNextDFSNode,
    indentChild,
    setFocus,
    splitChild,
    unindentChild,
    unsplitChild,
    replaceChildWithUid,
} from './commands';
import { onUnigraphContextMenu } from '../../components/ObjectView/DefaultObjectContextMenu';
import { noteQuery } from './noteQuery';
import { getParentsAndReferences } from '../../components/ObjectView/backlinksUtils';
import { DynamicObjectListView } from '../../components/ObjectView/DynamicObjectListView';
import { setCaret, TabContext } from '../../utils';
import { DragandDrop } from '../../components/ObjectView/DragandDrop';
import {
    inlineObjectSearch,
    inlineTextSearch,
} from '../../components/UnigraphCore/InlineSearchPopup';

export const getSubentities = (data: any) => {
    let subentities: any;
    let otherChildren: any;
    if (!data?._value?.children?.['_value[']) {
        [subentities, otherChildren] = [[], []];
    } else {
        [subentities, otherChildren] = data?._value?.children?.['_value[']
            .sort(byElementIndex)
            .reduce(
                (prev: any, el: any) => {
                    if (
                        el?._value?.type?.['unigraph.id'] !==
                            '$/schema/subentity' &&
                        !el._key
                    )
                        return [prev[0], [...prev[1], el._value]];
                    if (!el._key)
                        return [[...prev[0], el?._value._value], prev[1]];
                    return prev;
                },
                [[], []],
            ) || [[], []];
    }
    return [subentities, otherChildren];
};

export function NoteBlock({ data }: any) {
    const [parents, references] = getParentsAndReferences(
        data['~_value'],
        (data['unigraph.origin'] || []).filter(
            (el: any) => el.uid !== data.uid,
        ),
    );
    const [subentities, otherChildren] = getSubentities(data);
    const unpadded = unpad(data);

    return (
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <div style={{ flexGrow: 1 }}>
                <Typography variant="body1">
                    <AutoDynamicView
                        object={data.get('text')._value._value}
                        noDrag
                        noContextMenu
                        callbacks={{
                            'get-semantic-properties': () => data,
                        }}
                    />
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    {subentities.length} immediate children, {parents.length}{' '}
                    parents, {references.length} linked references
                </Typography>
            </div>
            <div>
                {otherChildren.map((el: any) => (
                    <AutoDynamicView object={el} inline />
                ))}
            </div>
        </div>
    );
}

const onNoteInput = (
    inputDebounced: any,
    event: FormEvent<HTMLSpanElement>,
) => {
    const newInput = event.currentTarget.textContent;

    inputDebounced.current(newInput);
};

const noteBlockCommands = {
    'add-child': addChild,
    'set-focus': setFocus,
    'unsplit-child': unsplitChild,
    'split-child': splitChild,
    'indent-child': indentChild,
    'unindent-child': unindentChild,
    'convert-child-to-todo': convertChildToTodo,
    'replace-child-with-uid': replaceChildWithUid,
};

export function PlaceholderNoteBlock({ callbacks }: any) {
    return (
        <div style={{ width: '100%' }}>
            <Typography
                variant="body1"
                style={{ fontStyle: 'italic' }}
                onClick={() => {
                    callbacks['add-child']();
                }}
            >
                Click here to start writing
            </Typography>
        </div>
    );
}

export function OutlineComponent({
    children,
    collapsed,
    setCollapsed,
    isChildren,
    createBelow,
}: any) {
    return (
        <div
            style={{
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'baseline',
                position: 'relative',
            }}
        >
            <div
                style={{ position: 'absolute', left: '-4px' }}
                className="showOnHover"
                onClick={() => setCollapsed(!collapsed)}
            >
                O
            </div>
            <div
                style={{ position: 'absolute', left: '-4px', top: '8px' }}
                className="showOnHover"
                onClick={() => createBelow()}
            >
                V
            </div>
            <div
                style={{
                    height: 'calc(100% + 4px)',
                    width: '1px',
                    backgroundColor: 'gray',
                    position: 'absolute',
                    left: '-12px',
                    display: isChildren ? '' : 'none',
                }}
            />
            <FiberManualRecord
                style={{
                    fontSize: '0.5rem',
                    marginLeft: '8px',
                    marginRight: '8px',
                    ...(collapsed
                        ? {
                              borderRadius: '4px',
                              color: 'lightgray',
                              backgroundColor: 'black',
                          }
                        : {}),
                }}
            />
            <div style={{ flexGrow: 1 }}>{children}</div>
        </div>
    );
}

export function ParentsAndReferences({ data }: any) {
    const [parents, setParents] = React.useState([]);
    const [references, setReferences] = React.useState([]);

    React.useEffect(() => {
        const [newPar, newRef]: any = getParentsAndReferences(
            data['~_value'],
            (data['unigraph.origin'] || []).filter(
                (el: any) => el.uid !== data.uid,
            ),
        );
        if (stringify(parents) !== stringify(newPar)) setParents(newPar);
        if (stringify(references) !== stringify(newRef)) setReferences(newRef);
    }, [data]);

    return (
        <div style={{ marginTop: '36px' }}>
            <DynamicObjectListView
                items={parents}
                context={null}
                compact
                noDrop
                titleBar=" parents"
                loadAll
            />
            <DynamicObjectListView
                items={references}
                context={null}
                compact
                noDrop
                titleBar=" linked references"
                loadAll
            />
        </div>
    );
}

function NoteViewPageWrapper({ children, isRoot }: any) {
    return !isRoot ? (
        children
    ) : (
        <div style={{ height: '100%', width: '100%', padding: '16px' }}>
            {children}
        </div>
    );
}

function NoteViewTextWrapper({
    children,
    semanticChildren,
    isRoot,
    onContextMenu,
    callbacks,
}: any) {
    // console.log(callbacks.BacklinkComponent);
    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            {children}
            {semanticChildren}
            {isRoot ? (
                <MoreVert
                    onClick={onContextMenu}
                    style={{ marginLeft: '8px' }}
                />
            ) : (
                []
            )}
            {callbacks.BacklinkComponent ? callbacks.BacklinkComponent : []}
        </div>
    );
}

export function DetailedNoteBlock({
    data,
    isChildren,
    callbacks,
    options,
    isCollapsed,
    focused,
    index,
}: any) {
    // eslint-disable-next-line no-bitwise
    isChildren |= callbacks?.isChildren;
    if (!callbacks?.viewId)
        callbacks = { ...(callbacks || {}), viewId: getRandomInt() };
    const [subentities, otherChildren] = getSubentities(data);
    const [command, setCommand] = React.useState<() => any | undefined>();
    const inputter = (text: string) => {
        if (data?._value?.children?.['_value[']) {
            const deadLinks: any = [];
            data._value.children['_value['].forEach((el: any) => {
                if (el && el._key && !text.includes(el._key))
                    deadLinks.push(el.uid);
            });
            if (deadLinks.length)
                window.unigraph.deleteItemFromArray(
                    data._value.children.uid,
                    deadLinks,
                    data.uid,
                );
        }

        return window.unigraph.updateObject(
            data.get('text')._value._value.uid,
            {
                '_value.%': text,
            },
            false,
            false,
            callbacks.subsId,
        );
    };
    const [inSearch, setInSearch] = React.useState(false);
    /** Reference for the data object (for children) */
    const dataref = React.useRef<any>();
    /** Reference for text content as a string */
    const textref = React.useRef<any>();
    /** Reference for HTML Element for list of children */
    const editorRef = React.useRef<any>();
    const childrenref = React.useRef<any>();
    const inputDebounced = React.useRef(_.debounce(inputter, 333));
    const setCurrentText = (text: string) => {
        textInput.current.textContent = text;
    };
    const edited = React.useRef(false);
    const [isEditing, setIsEditing] = React.useState(
        window.unigraph.getState('global/focused').value?.uid === data.uid,
    );
    const textInput: any = React.useRef();
    const nodesState = window.unigraph.addState(
        `${
            options?.viewId || callbacks?.viewId || callbacks['get-view-id']()
        }/nodes`,
        [],
    );
    const editorContext = {
        edited,
        setCommand,
        childrenref,
        callbacks,
        nodesState,
    };
    const tabContext = React.useContext(TabContext);

    const commandFn = () => {
        if (edited.current !== true && command) {
            command();
            setCommand(undefined);
        }
    };
    const resetEdited = () => {
        edited.current = false;
        setTimeout(() => {
            commandFn();
        });
    };

    const [isChildrenCollapsed, setIsChildrenCollapsed] = React.useState<any>(
        {},
    );

    React.useEffect(() => {
        const newNodes = _.unionBy(
            [
                {
                    uid: data.uid,
                    children: subentities.map((el: any) => el.uid),
                    type: data?.type?.['unigraph.id'],
                    root: !isChildren,
                },
                ...subentities
                    .filter(
                        (el: any) =>
                            el?.type?.['unigraph.id'] !== '$/schema/note_block',
                    )
                    .map((el: any) => {
                        const [subs] = getSubentities(el);
                        return {
                            uid: el.uid,
                            children: subs.map((ell: any) => ell.uid),
                            type: el?.type?.['unigraph.id'],
                            root: false,
                        };
                    }),
            ],
            nodesState.value,
            'uid',
        );
        nodesState.setValue(newNodes);
        // if (!isChildren) console.log(getParentsAndReferences(data['~_value'], (data['unigraph.origin'] || []).filter((el: any) => el.uid !== data.uid)))

        return function cleanup() {
            inputDebounced.current.flush();
        };
    }, [data]);

    React.useEffect(() => {
        dataref.current = data;
        const dataText = data.get('text').as('primitive');
        if (dataText && options?.viewId && !callbacks.isEmbed)
            window.layoutModel.doAction(
                Actions.renameTab(options.viewId, `Note: ${dataText}`),
            );
        if (isEditing && textref.current !== dataText && !edited.current) {
            setCurrentText(dataText);
            textInput.current.textContent = dataText;
        }
        if (textref.current !== dataText && !edited.current) {
            textref.current = dataText;
        } else if (
            (textref.current === dataText && edited.current) ||
            textref.current === undefined
        ) {
            resetEdited();
        }
    }, [data, isEditing]);

    React.useEffect(() => {
        if (
            isEditing &&
            textInput.current?.textContent === '' &&
            data.get('text').as('primitive')
        ) {
            textInput.current.textContent = textref.current;
        }
    }, [isEditing]);

    React.useEffect(() => {
        if (focused) {
            setIsEditing(true);
            if (isEditing) textInput.current.focus();
            setTimeout(() => {
                let tail;
                const focusedState =
                    window.unigraph.getState('global/focused').value;
                const el = textInput.current.firstChild || textInput.current;
                if (focusedState.tail) tail = el.textContent.length;
                setCaret(document, el, tail || focusedState.caret);
            }, 0);
        }
    }, [focused]);

    React.useEffect(() => {
        if (focused) {
            window.unigraph.getState('global/focused/actions').setValue({
                splitChild: () => {
                    const sel = document.getSelection();
                    const caret = _.min([
                        sel?.anchorOffset,
                        sel?.focusOffset,
                    ]) as number;
                    callbacks['split-child'](
                        textref.current || data.get('text').as('primitive'),
                        caret,
                    );
                },
                indentChild: callbacks['indent-child'],
                unindentChild: callbacks['unindent-child-in-parent'],
            });
        }
    }, [data, focused]);

    React.useEffect(commandFn, [command]);

    return (
        <NoteViewPageWrapper isRoot={!isChildren}>
            <div
                style={{
                    width: '100%',
                    ...(!isChildren ? { overflow: 'hidden' } : {}),
                }}
            >
                <NoteViewTextWrapper
                    isRoot={!isChildren}
                    onContextMenu={(event: any) =>
                        onUnigraphContextMenu(event, data, undefined, callbacks)
                    }
                    callbacks={callbacks}
                    semanticChildren={buildGraph(otherChildren)
                        .filter((el: any) => el.type)
                        .map((el: any) => (
                            <AutoDynamicView
                                object={
                                    el.type?.['unigraph.id'] ===
                                    '$/schema/note_block'
                                        ? el
                                        : { uid: el.uid, type: el.type }
                                }
                                inline
                            />
                        ))}
                >
                    <div
                        ref={editorRef}
                        onPointerUp={(ev) => {
                            if (!isEditing) {
                                setIsEditing(true);
                                const caretPos = Number(
                                    (ev.target as HTMLElement).getAttribute(
                                        'markdownPos',
                                    ) || -1,
                                );
                                setTimeout(() => {
                                    const finalCaretPos =
                                        caretPos === -1
                                            ? textInput.current?.textContent
                                                  ?.length
                                            : caretPos;
                                    window.unigraph
                                        .getState('global/focused')
                                        .setValue({
                                            uid: data?.uid,
                                            caret: finalCaretPos,
                                            type: '$/schema/note_block',
                                        });
                                    if (textInput.current.firstChild) {
                                        setCaret(
                                            document,
                                            textInput.current.firstChild,
                                            finalCaretPos,
                                        );
                                    } else {
                                        setCaret(
                                            document,
                                            textInput.current,
                                            0,
                                        );
                                    }
                                }, 0);
                            }
                        }}
                        onBlur={(ev) => {
                            setIsEditing(false);
                            inputDebounced.current.flush();
                            if (focused) {
                                window.unigraph
                                    .getState('global/focused')
                                    .setValue({ uid: '', caret: 0, type: '' });
                            }
                        }}
                        style={{ width: '100%' }}
                    >
                        {isEditing ? (
                            <Typography
                                variant={
                                    isChildren || callbacks.isEmbed
                                        ? 'body1'
                                        : 'h4'
                                }
                                onContextMenu={
                                    isChildren
                                        ? undefined
                                        : (event) =>
                                              onUnigraphContextMenu(
                                                  event,
                                                  data,
                                                  undefined,
                                                  callbacks,
                                              )
                                }
                                contentEditable
                                style={{ outline: '0px solid transparent' }}
                                suppressContentEditableWarning
                                ref={textInput}
                                onInput={(ev) => {
                                    if (
                                        ev.currentTarget.textContent !==
                                            data.get('text').as('primitive') &&
                                        !edited.current
                                    )
                                        edited.current = true;
                                    const newContent =
                                        ev.currentTarget.textContent;
                                    const caret = document.getSelection()
                                        ?.anchorOffset as number;
                                    // Check if inside a reference block

                                    let hasMatch = false;
                                    hasMatch =
                                        inlineTextSearch(
                                            textInput.current.textContent,
                                            textInput,
                                            caret,
                                            async (
                                                match: any,
                                                newName: string,
                                                newUid: string,
                                            ) => {
                                                const parents =
                                                    getParentsAndReferences(
                                                        data['~_value'],
                                                        data[
                                                            'unigraph.origin'
                                                        ] || [],
                                                    )[0].map((el: any) => ({
                                                        uid: el.uid,
                                                    }));
                                                if (!data._hide)
                                                    parents.push({
                                                        uid: data.uid,
                                                    });
                                                const newStr = `${newContent?.slice?.(
                                                    0,
                                                    match.index,
                                                )}[[${newName}]]${newContent?.slice?.(
                                                    match.index +
                                                        match[0].length,
                                                )}`;
                                                // console.log(newName, newUid, newStr, newContent);
                                                // This is an ADDITION operation
                                                // console.log(data);
                                                const semChildren =
                                                    data?._value;
                                                // inputDebounced.cancel();
                                                textInput.current.textContent =
                                                    newStr;
                                                textref.current = newStr;
                                                resetEdited();
                                                if (
                                                    textInput.current.firstChild
                                                ) {
                                                    setCaret(
                                                        document,
                                                        textInput.current
                                                            .firstChild,
                                                        match.index +
                                                            newName.length +
                                                            4,
                                                    );
                                                } else {
                                                    setCaret(
                                                        document,
                                                        textInput.current,
                                                        match.index +
                                                            newName.length +
                                                            4,
                                                    );
                                                }
                                                await window.unigraph.updateObject(
                                                    data.uid,
                                                    {
                                                        _value: {
                                                            text: {
                                                                _value: {
                                                                    _value: {
                                                                        '_value.%':
                                                                            newStr,
                                                                    },
                                                                },
                                                            },
                                                            children: {
                                                                '_value[': [
                                                                    {
                                                                        _index: {
                                                                            '_value.#i':
                                                                                semChildren
                                                                                    ?.children?.[
                                                                                    '_value['
                                                                                ]
                                                                                    ?.length ||
                                                                                0,
                                                                        },
                                                                        _key: `[[${newName}]]`,
                                                                        _value: {
                                                                            'dgraph.type':
                                                                                [
                                                                                    'Interface',
                                                                                ],
                                                                            type: {
                                                                                'unigraph.id':
                                                                                    '$/schema/interface/semantic',
                                                                            },
                                                                            _hide: true,
                                                                            _value: {
                                                                                uid: newUid,
                                                                            },
                                                                        },
                                                                    },
                                                                ],
                                                            },
                                                        },
                                                    },
                                                    true,
                                                    false,
                                                    callbacks.subsId,
                                                    parents,
                                                );
                                                window.unigraph
                                                    .getState(
                                                        'global/searchPopup',
                                                    )
                                                    .setValue({ show: false });
                                            },
                                            setInSearch,
                                        ) || hasMatch;
                                    hasMatch =
                                        inlineObjectSearch(
                                            textInput.current.textContent,
                                            textInput,
                                            caret,
                                            async (
                                                match: any,
                                                newName: string,
                                                newUid: string,
                                            ) => {
                                                callbacks[
                                                    'replace-child-with-uid'
                                                ](newUid);
                                                await callbacks['add-child']();
                                                window.unigraph
                                                    .getState(
                                                        'global/searchPopup',
                                                    )
                                                    .setValue({ show: false });
                                                setTimeout(() => {
                                                    callbacks[
                                                        'focus-next-dfs-node'
                                                    ](data, editorContext, 0);
                                                }, 500);
                                            },
                                            setInSearch,
                                        ) || hasMatch;
                                    if (!hasMatch) {
                                        window.unigraph
                                            .getState('global/searchPopup')
                                            .setValue({ show: false });
                                        setInSearch(false);
                                    }

                                    textref.current =
                                        ev.currentTarget.textContent;
                                    onNoteInput(inputDebounced, ev);
                                }}
                                onKeyDown={async (ev) => {
                                    const sel = document.getSelection();
                                    const caret = _.min([
                                        sel?.anchorOffset,
                                        sel?.focusOffset,
                                    ]) as number;
                                    switch (ev.keyCode) {
                                        case 13: // enter
                                            ev.preventDefault();
                                            edited.current = false;
                                            inputDebounced.current.cancel();
                                            setCommand(() =>
                                                callbacks['split-child']?.bind(
                                                    null,
                                                    textref.current ||
                                                        data
                                                            .get('text')
                                                            .as('primitive'),
                                                    caret,
                                                ),
                                            );
                                            break;

                                        case 9: // tab
                                            ev.preventDefault();
                                            inputDebounced.current.flush();
                                            if (ev.shiftKey) {
                                                setCommand(() =>
                                                    callbacks[
                                                        'unindent-child-in-parent'
                                                    ]?.bind(null),
                                                );
                                            } else {
                                                setCommand(() =>
                                                    callbacks[
                                                        'indent-child'
                                                    ]?.bind(null),
                                                );
                                            }
                                            break;

                                        case 8: // backspace
                                            // console.log(caret, document.getSelection()?.type)
                                            if (
                                                caret === 0 &&
                                                document.getSelection()
                                                    ?.type === 'Caret' &&
                                                !textref.current.length
                                            ) {
                                                ev.preventDefault();
                                                // inputDebounced.cancel();
                                                edited.current = false;
                                                setCommand(() =>
                                                    callbacks[
                                                        'unsplit-child'
                                                    ].bind(null),
                                                );
                                            } else if (
                                                textref.current[caret - 1] ===
                                                    '[' &&
                                                textref.current[caret] === ']'
                                            ) {
                                                ev.preventDefault();
                                                const tc = textref.current;
                                                const el =
                                                    textInput.current
                                                        .firstChild;
                                                el.textContent =
                                                    tc.slice(0, caret - 1) +
                                                    tc.slice(caret + 1);
                                                textref.current =
                                                    el.textContent;
                                                setCaret(
                                                    document,
                                                    el,
                                                    caret - 1,
                                                );
                                            }
                                            break;

                                        case 38: // up arrow
                                            ev.preventDefault();
                                            inputDebounced.current.flush();
                                            setCommand(() =>
                                                callbacks[
                                                    'focus-last-dfs-node'
                                                ].bind(
                                                    null,
                                                    data,
                                                    editorContext,
                                                    0,
                                                ),
                                            );
                                            return;

                                        case 40: // down arrow
                                            ev.preventDefault();
                                            inputDebounced.current.flush();
                                            setCommand(() =>
                                                callbacks[
                                                    'focus-next-dfs-node'
                                                ].bind(
                                                    null,
                                                    data,
                                                    editorContext,
                                                    0,
                                                ),
                                            );
                                            return;

                                        case 219: // left bracket
                                            if (!ev.shiftKey) {
                                                ev.preventDefault();
                                                // console.log(document.getSelection())
                                                let middle =
                                                    document
                                                        .getSelection()
                                                        ?.toString() || '';
                                                let end = '';
                                                if (middle.endsWith(' ')) {
                                                    middle = middle.slice(
                                                        0,
                                                        middle.length - 1,
                                                    );
                                                    end = ' ';
                                                }
                                                document.execCommand(
                                                    'insertText',
                                                    false,
                                                    `[${middle}]${end}`,
                                                );
                                                // console.log(caret, document.getSelection(), middle)
                                                setCaret(
                                                    document,
                                                    textInput.current
                                                        .firstChild,
                                                    caret + 1,
                                                    middle.length,
                                                );
                                            }
                                            break;

                                        case 57: // 9 or parenthesis
                                            if (ev.shiftKey) {
                                                ev.preventDefault();
                                                // console.log(document.getSelection())
                                                let middle =
                                                    document
                                                        .getSelection()
                                                        ?.toString() || '';
                                                let end = '';
                                                if (middle.endsWith(' ')) {
                                                    middle = middle.slice(
                                                        0,
                                                        middle.length - 1,
                                                    );
                                                    end = ' ';
                                                }
                                                document.execCommand(
                                                    'insertText',
                                                    false,
                                                    `(${middle})${end}`,
                                                );
                                                // console.log(caret, document.getSelection(), middle)
                                                setCaret(
                                                    document,
                                                    textInput.current
                                                        .firstChild,
                                                    caret + 1,
                                                    middle.length,
                                                );
                                            }
                                            break;

                                        default:
                                            // console.log(ev);
                                            break;
                                    }
                                    const state =
                                        window.unigraph.getState(
                                            'global/focused',
                                        );
                                    state.setValue({ ...state.value, caret });
                                }}
                            />
                        ) : (
                            <AutoDynamicView
                                object={data.get('text')._value._value}
                                attributes={{
                                    isHeading: !(
                                        isChildren || callbacks.isEmbed
                                    ),
                                }}
                                noDrag
                                noContextMenu
                                inline
                                noClickthrough
                                callbacks={{
                                    'get-semantic-properties': () => data,
                                }}
                            />
                        )}
                    </div>
                </NoteViewTextWrapper>
                {!isChildren ? <div style={{ height: '12px' }} /> : []}
                {!(isCollapsed === true) ? (
                    <div ref={childrenref} style={{ width: '100%' }}>
                        {subentities.length || isChildren ? (
                            <DragandDrop
                                dndContext={tabContext.viewId}
                                listId={data?.uid}
                                arrayId={data?._value?.children?.uid}
                                style={{
                                    position: 'absolute',
                                    height: '6px',
                                    marginTop: '-3px',
                                    marginBottom: '1px',
                                    zIndex: 999,
                                }}
                            >
                                {buildGraph(subentities).map(
                                    (el: any, elindex) => {
                                        const isCol =
                                            isChildrenCollapsed[el.uid];
                                        return (
                                            <OutlineComponent
                                                key={el.uid}
                                                isChildren={isChildren}
                                                collapsed={isCol}
                                                setCollapsed={(
                                                    val: boolean,
                                                ) => {
                                                    setIsChildrenCollapsed({
                                                        ...isChildrenCollapsed,
                                                        [el.uid]: val,
                                                    });
                                                }}
                                                createBelow={() => {
                                                    addChild(
                                                        dataref.current,
                                                        editorContext,
                                                    );
                                                }}
                                            >
                                                <AutoDynamicView
                                                    noDrag
                                                    compact
                                                    allowSubentity
                                                    noClickthrough
                                                    noSubentities={
                                                        el.type?.[
                                                            'unigraph.id'
                                                        ] ===
                                                        '$/schema/note_block'
                                                    }
                                                    noBacklinks={
                                                        el.type?.[
                                                            'unigraph.id'
                                                        ] ===
                                                        '$/schema/note_block'
                                                    }
                                                    subentityExpandByDefault={
                                                        !(
                                                            el.type?.[
                                                                'unigraph.id'
                                                            ] ===
                                                            '$/schema/note_block'
                                                        )
                                                    }
                                                    object={
                                                        el.type?.[
                                                            'unigraph.id'
                                                        ] ===
                                                        '$/schema/note_block'
                                                            ? el
                                                            : {
                                                                  uid: el.uid,
                                                                  type: el.type,
                                                              }
                                                    }
                                                    index={elindex}
                                                    callbacks={{
                                                        'get-view-id': () =>
                                                            options?.viewId, // only used at root
                                                        ...callbacks,
                                                        ...Object.fromEntries(
                                                            Object.entries(
                                                                noteBlockCommands,
                                                            ).map(
                                                                ([
                                                                    k,
                                                                    v,
                                                                ]: any) => [
                                                                    k,
                                                                    (
                                                                        ...args: any[]
                                                                    ) =>
                                                                        v(
                                                                            dataref.current,
                                                                            editorContext,
                                                                            elindex,
                                                                            ...args,
                                                                        ),
                                                                ],
                                                            ),
                                                        ),
                                                        'unindent-child-in-parent':
                                                            () => {
                                                                callbacks[
                                                                    'unindent-child'
                                                                ](elindex);
                                                            },
                                                        'focus-last-dfs-node':
                                                            focusLastDFSNode,
                                                        'focus-next-dfs-node':
                                                            focusNextDFSNode,
                                                        dataref,
                                                        context: data,
                                                        isEmbed: true,
                                                        isChildren: true,
                                                        parentEditorContext:
                                                            editorContext,
                                                    }}
                                                    component={{
                                                        '$/schema/note_block': {
                                                            view: DetailedNoteBlock,
                                                            query: noteQuery,
                                                        },
                                                        '$/schema/view': {
                                                            view: ViewViewDetailed,
                                                        },
                                                    }}
                                                    attributes={{
                                                        isChildren: true,
                                                        isCollapsed: isCol,
                                                    }}
                                                    recursive
                                                    style={
                                                        el.type?.[
                                                            'unigraph.id'
                                                        ] ===
                                                        '$/schema/note_block'
                                                            ? {}
                                                            : {
                                                                  border: 'lightgray',
                                                                  borderStyle:
                                                                      'solid',
                                                                  borderWidth:
                                                                      'thin',
                                                                  margin: '2px',
                                                                  borderRadius:
                                                                      '8px',
                                                                  maxWidth:
                                                                      'fit-content',
                                                                  padding:
                                                                      '4px',
                                                              }
                                                    }
                                                />
                                            </OutlineComponent>
                                        );
                                    },
                                )}
                            </DragandDrop>
                        ) : (
                            <OutlineComponent isChildren={isChildren}>
                                <PlaceholderNoteBlock
                                    callbacks={{
                                        'add-child': () =>
                                            noteBlockCommands['add-child'](
                                                dataref.current,
                                                editorContext,
                                            ),
                                    }}
                                />
                            </OutlineComponent>
                        )}
                    </div>
                ) : (
                    []
                )}
                {!isChildren ? <ParentsAndReferences data={data} /> : []}
            </div>
        </NoteViewPageWrapper>
    );
}
