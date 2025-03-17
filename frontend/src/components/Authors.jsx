import { gql, useMutation, useQuery } from "@apollo/client";
import { useState } from "react";

const ALL_AUTHORS = gql`
  query AllAuthors {
    allAuthors {
      name
      born
      bookCount
    }
  }
`;

const EDIT_AUTHOR = gql`
  mutation EditAuthor($name: String!, $setBornTo: Int!) {
    editAuthor(name: $name, setBornTo: $setBornTo) {
      name
      born
      bookCount
    }
  }
`;

const Authors = (props) => {
  const result = useQuery(ALL_AUTHORS);
  const [editAuthor] = useMutation(EDIT_AUTHOR, {
    refetchQueries: [{ query: ALL_AUTHORS }],
  });

  const [authorName, setAuthorName] = useState(
    result?.data?.allAuthors[0].name
  );
  const [newBorn, setNewBorn] = useState(undefined);
  if (result.loading) {
    return <div>loading...</div>;
  }

  if (!props.show) {
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log({ authorName, newBorn });
    editAuthor({ variables: { name: authorName, setBornTo: Number(newBorn) } });
    setNewBorn("");
  };

  return (
    <div>
      <h2>authors</h2>
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>born</th>
            <th>books</th>
          </tr>
          {result.data.allAuthors.map((a) => (
            <tr key={a.name}>
              <td>{a.name}</td>
              <td>{a.born}</td>
              <td>{a.bookCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form onSubmit={handleSubmit}>
        <h3>Set birthyear</h3>
        <div>
          name
          <select
            value={authorName}
            onChange={({ target }) => setAuthorName(target.value)}
          >
            {result.data.allAuthors.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          birth year
          <input
            value={newBorn}
            onChange={({ target }) => setNewBorn(target.value)}
          />
        </div>
        <button type="submit">update author</button>
      </form>
    </div>
  );
};

export default Authors;
