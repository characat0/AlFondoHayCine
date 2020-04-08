export const APIKEY = process.env.API_KEY;
export const PORT = parseInt(process.env.PORT);
export const PROTOCOL = process.env.PROTOCOL;
let origins: string[] = ['*'];
try {
    origins = JSON.parse(process.env.ORIGINS);
} catch (e){
    console.error(e);
}
export let ORIGINS: string[] = origins;
