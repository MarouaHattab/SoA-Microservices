const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, 'hello.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const helloProto = grpc.loadPackageDefinition(packageDefinition).hello;
const client = new helloProto.Greeter(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

const name = process.argv[2] || 'World';

client.sayHello({ name: name }, (err, response) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('Response:', response.message);
});