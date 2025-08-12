import { Core_Console_Log } from './lib/ericchase/Core_Console_Log.js';

type Client = import('pg').Client;

const getClient = (() => {
  const client: Client | undefined = undefined;
  return async (): Promise<Client> => {
    try {
      if (client === undefined) {
        // the kind of thing that would go in a .env file
        // these credentials match up to the ones in the database compose file
        const Client = (await import('pg')).Client;
        const client = new Client({
          host: '0.0.0.0',
          port: 5432,
          user: 'dev',
          password: 'devpassword',
          database: 'dev',
        });
        await client.connect();
        return client;
      }
      throw new Error('client === undefined');
    } catch (error: any) {
      if ((error as Error).message?.startsWith("Cannot find package 'pg'")) {
        Core_Console_Log('Please install the "pg" package via "bun add pg".');
      } else {
        Core_Console_Log('Confirm that the database docker container is running.');
      }
      Core_Console_Log(error);
      throw new Error('Server Database Error');
    }
  };
})();

export async function query(text: string, values: any[]) {
  try {
    const client = await getClient();
    const response = await client.query(text, values);
    return response.rows;
  } catch (error: any) {
    const { detail, message } = error;
    return { message, detail };
  }
}
