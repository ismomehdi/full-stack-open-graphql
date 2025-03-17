import { gql, useQuery } from "@apollo/client";

const ALL_BOOKS = gql`
  query AllBooks {
    allBooks {
      author {
        name
      }
      published
      title
    }
  }
`;

const Books = (props) => {
  if (!props.show) {
    return null;
  }

  const books = useQuery(ALL_BOOKS).data?.allBooks || [];
  console.log({ books });
  return (
    <div>
      <h2>books</h2>

      <table>
        <tbody>
          <tr>
            <th></th>
            <th>author</th>
            <th>published</th>
          </tr>
          {books.map((a) => (
            <tr key={a.title}>
              <td>{a.title}</td>
              <td>{a.author.name}</td>
              <td>{a.published}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Books;
