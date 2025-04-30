// schema.js avec mutations
const typeDefs = `#graphql
  type Movie {
    id: String!
    title: String!
    description: String!
  }

  type TVShow {
    id: String!
    title: String!
    description: String!
  }

  type DeleteResponse {
    success: Boolean!
    message: String
  }

  type Query {
    movie(id: String!): Movie
    movies(query: String): [Movie]
    tvShow(id: String!): TVShow
    tvShows(query: String): [TVShow]
  }

  type Mutation {
    # Mutations pour les films
    createMovie(id: String!, title: String!, description: String): Movie
    updateMovie(id: String!, title: String, description: String): Movie
    deleteMovie(id: String!): DeleteResponse

    # Mutations pour les séries TV
    createTVShow(id: String!, title: String!, description: String): TVShow
    updateTVShow(id: String!, title: String, description: String): TVShow
    deleteTVShow(id: String!): DeleteResponse
  }
`;

module.exports = typeDefs;