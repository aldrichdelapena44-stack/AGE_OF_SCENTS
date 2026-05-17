type PageShellProps = {
    title: string;
    description?: string;
    children: React.ReactNode;
};

export default function PageShell({
    title,
    description,
    children
}: PageShellProps) {
    return (
        <section className="page-shell">
            <div className="page-shell__header">
                <p className="eyebrow">AGE OF SCENT</p>
                <h1>{title}</h1>
                {description ? <p className="muted">{description}</p> : null}
            </div>

            <div className="page-shell__content">{children}</div>
        </section>
    );
}
