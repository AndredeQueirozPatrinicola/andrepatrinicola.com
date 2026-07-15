export type ListProps = {
  title: string;
  list: (string | ListProps)[];
};

export function List({ title, list }: ListProps) {
  return (
    <>
        <strong>{title}</strong>
        <ul>
            {list.map((item, index) => {
                if (typeof item === "object") {
                return (
                    <li key={index}>
                    <List title={item.title} list={item.list} />
                    </li>
                );
                }
                return <li key={index}>{item}</li>;
            })}
        </ul>
    </>
  );
}