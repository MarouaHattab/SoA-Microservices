# GraphQL Test Queries for PropTech Connect

## Property Queries

### Get All Properties with Filters
```graphql
query {
  properties(
    location: "New York"
    min_price: 100000
    max_price: 500000
    bedrooms: 2
    property_type: "apartment"
    page: 1
    limit: 5
  ) {
    id
    title
    price
    location
    address
    bedrooms
    bathrooms
    area
    property_type
    average_rating
    owner_id
  }
}
```

### Get Property Details with Reviews
```graphql
query {
  property(id: "{{existing_property_id}}") {
    id
    title
    description
    price
    location
    address
    bedrooms
    bathrooms
    area
    property_type
    features
    images
    average_rating
    total_ratings
    owner_id
    created_at
    updated_at
  }
}
```

## User Queries

### Get Current User with Properties and Appointments
```graphql
query {
  me {
    id
    name
    email
    role
    phone
    properties {
      id
      title
      price
      location
    }
    appointments {
      id
      property_id
      date
      status
      duration
    }
    favorites {
      id
      title
      price
    }
  }
}
```

### Get User by ID
```graphql
query {
  user(id: "{{user_id}}") {
    id
    name
    email
    role
    phone
  }
}
```

## Appointment Queries

### Get User Appointments with Property Details
```graphql
query {
  appointments {
    id
    property_id
    date
    duration
    type
    status
    message
    property {
      title
      address
      price
    }
  }
}
```

## Chat Queries

### Get User Chats with Last Message
```graphql
query {
  chats {
    id
    participants {
      id
      name
    }
    property {
      id
      title
    }
    last_message {
      content
      created_at
    }
    unread_count
  }
}
```

### Get Chat Messages
```graphql
query {
  chat(id: "{{chat_id}}") {
    id
    messages {
      id
      sender_id
      content
      created_at
    }
    participants {
      id
      name
    }
  }
}
```

## Mutations

### Create Property
```graphql
mutation {
  createProperty(
    input: {
      title: "GraphQL Test Property"
      description: "Created via GraphQL"
      price: 350000
      location: "Boston"
      address: "123 GraphQL St, Boston, MA"
      bedrooms: 3
      bathrooms: 2
      area: 1500
      property_type: "house"
      features: ["backyard", "renovated", "fireplace"]
      images: ["https://example.com/img1.jpg"]
    }
  ) {
    property {
      id
      title
      price
    }
  }
}
```

### Update Property
```graphql
mutation {
  updateProperty(
    id: "{{new_property_id}}"
    input: {
      title: "Updated via GraphQL"
      price: 375000
    }
  ) {
    property {
      id
      title
      price
      updated_at
    }
  }
}
```

### Add Property Review
```graphql
mutation {
  addReview(
    input: {
      property_id: "{{existing_property_id}}"
      rating: 5
      comment: "Amazing property, highly recommended!"
    }
  ) {
    review {
      id
      rating
      comment
      created_at
    }
  }
}
```

### Schedule Appointment
```graphql
mutation {
  createAppointment(
    input: {
      property_id: "{{existing_property_id}}"
      date: "2024-09-01T15:00:00Z"
      duration: 60
      type: "viewing"
      message: "I would like to see this property"
    }
  ) {
    appointment {
      id
      date
      status
    }
  }
}
```

### Send Chat Message
```graphql
mutation {
  sendMessage(
    chat_id: "{{chat_id}}"
    content: "Is this property still available?"
  ) {
    message {
      id
      content
      created_at
    }
  }
}
``` 