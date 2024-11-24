import { createClient, cacheExchange, fetchExchange } from "@urql/core"

const client = createClient({
    url: "https://api.studio.thegraph.com/query/81322/phhdtincentive2contracts3/v0.0.1",
    exchanges: [cacheExchange, fetchExchange],
})

export default client
