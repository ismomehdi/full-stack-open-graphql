const { WebSocketServer } = require("ws");
const { useServer } = require("graphql-ws/lib/use/ws");

const { ApolloServer } = require("@apollo/server");
const { GraphQLError } = require("graphql");

const { PubSub } = require("graphql-subscriptions");
const pubsub = new PubSub();

const { expressMiddleware } = require("@apollo/server/express4");
const {
  ApolloServerPluginDrainHttpServer,
} = require("@apollo/server/plugin/drainHttpServer");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const express = require("express");
const cors = require("cors");
const http = require("http");

const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
mongoose.set("strictQuery", false);
const Author = require("./models/author");
const Book = require("./models/book");
const User = require("./models/user");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log("connecting to", MONGODB_URI);

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("connected to MongoDB");
  })
  .catch((error) => {
    console.log("error connection to MongoDB:", error.message);
  });

const typeDefs = `
  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Subscription {
    bookAdded: Book!
  }   

  type Token {
    value: String!
  }

  type Book {
    title: String!
    published: Int!
    author: Author!
    genres: [String!]!
    id: ID!
  }

	type Author {
		name: String!
		id: ID!
		born: Int
		bookCount: Int
	}

  type Query {
    me: User
    bookCount: Int
    authorCount: Int
    allBooks(author: String, genre: String): [Book!]!
		allAuthors: [Author!]!
  }

	type Mutation {
		addBook(
			title: String!
			published: Int!
			author: String!
			genres: [String!]!
		): Book

		editAuthor(
			name: String!
			setBornTo: Int!
		): Author

    createUser(
      username: String!
      favoriteGenre: String!
    ): User

    login(
      username: String!
      password: String!
    ): Token
}
`;

const resolvers = {
  Author: {
    bookCount: async (root) => {
      return root.bookCount || 0;
    },
  },
  Query: {
    bookCount: async () => {
      return await Book.countDocuments();
    },
    authorCount: async () => await Author.countDocuments(),
    allBooks: async (root, args) => {
      if (args.genre)
        return await Book.find({
          genres: { $in: args.genre },
        }).populate("author");

      return await Book.find({}).populate("author");
    },
    allAuthors: async () => {
      return await Author.find({});
    },
    me: (root, args, context) => {
      return context.currentUser;
    },
  },
  Mutation: {
    addBook: async (root, args, context) => {
      try {
        const currentUser = context.currentUser;

        if (!currentUser) {
          throw new GraphQLError("not authenticated", {
            extensions: {
              code: "BAD_USER_INPUT",
            },
          });
        }

        let author = await Author.findOne({ name: args.author });

        if (!author) {
          author = new Author({ name: args.author, bookCount: 1 });
          await author.save();
        } else {
          author.bookCount += 1;
          await author.save();
        }

        const book = new Book({ ...args, author: author._id });
        const savedBook = await book.save();

        pubsub.publish("BOOK_ADDED", { bookAdded: savedBook });
        return await savedBook.populate("author");
      } catch (err) {
        throw new GraphQLError("Adding a book failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.name,
            err,
          },
        });
      }
    },
    editAuthor: async (root, args, context) => {
      const currentUser = context.currentUser;

      if (!currentUser) {
        throw new GraphQLError("not authenticated", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      try {
        const author = await Author.findOne({ name: args.name });
        if (!author) return null;

        return await Author.findByIdAndUpdate(
          author._id,
          { $set: { born: args.setBornTo } },
          { new: true }
        );
      } catch (err) {
        throw new GraphQLError("Editing author failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.name,
            err,
          },
        });
      }
    },
    createUser: async (root, args) => {
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre,
      });

      return user.save().catch((error) => {
        throw new GraphQLError("Creating the user failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.username,
            error,
          },
        });
      });
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });

      if (!user || args.password !== "secret") {
        throw new GraphQLError("wrong credentials", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      };

      return { value: jwt.sign(userForToken, process.env.JWT_SECRET) };
    },
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator("BOOK_ADDED"),
    },
  },
};

const start = async () => {
  const app = express();
  const httpServer = http.createServer(app);

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/",
  });

  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const serverCleanup = useServer({ schema }, wsServer);

  const server = new ApolloServer({
    schema: makeExecutableSchema({ typeDefs, resolvers }),
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });
  await server.start();
  app.use(
    "/",
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const auth = req ? req.headers.authorization : null;
        if (auth && auth.startsWith("Bearer ")) {
          const decodedToken = jwt.verify(
            auth.substring(7),
            process.env.JWT_SECRET
          );
          const currentUser = await User.findById(decodedToken.id);
          return { currentUser };
        }
      },
    })
  );
  const PORT = 4000;
  httpServer.listen(PORT, () =>
    console.log(`Server is now running on http://localhost:${PORT}`)
  );
};

start();
