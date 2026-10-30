"use client";
import Link from "next/link";
type BackControlProps = {
    href: string;
    onClick?: never;
} | {
    href?: never;
    onClick: () => void;
};
/** One label and one visual treatment across every public reading route. */
export function BackControl(props: BackControlProps) {
    const content = (<>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M6 2h2v2H6v2H4v1h10v2H4v1h2v2h2v2H6v-2H4v-2H2V6h2V4h2z"/>
      </svg>
      <span>Back</span>
    </>);
    return props.href ? (<Link href={props.href} className="pixel-control back-control">{content}</Link>) : (<button type="button" className="pixel-control back-control" onClick={props.onClick}>{content}</button>);
}
