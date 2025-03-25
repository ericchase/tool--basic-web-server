import { Client } from 'pg';

const getClient = (() => {
  const client: Client | undefined = undefined;
  return async (): Promise<Client> => {
    try {
      if (client === undefined) {
        // the kind of thing that would go in a .env file
        // these credentials match up to the ones in the database compose file
        const client = new Client({
          host: 'localhost',
          port: 5432,
          user: 'dev',
          password: 'devpassword',
          database: 'dev',
        });
        await client.connect();
        return client;
      }
      throw new Error('client === undefined');
    } catch (error) {
      throw new Error(`
  PostgreSQL Database Failure
Confirm that the database docker container is running.
Error: ${error}
`);
    }
  };
})();

export async function query(text: string, params: any[]) {
  const client = await getClient();
  const response = await client.query(text, params);
  return response.rows;
}
