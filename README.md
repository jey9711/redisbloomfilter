# redisbloomfilter

[![bloom-filter](https://upload.wikimedia.org/wikipedia/commons/a/ac/Bloom_filter.svg)](https://en.wikipedia.org/wiki/Bloom_filter)


## Bloom filters ##
Bloom filters are a probabilistic, one-way data structure. A simple Bloom filter should be able to do two things:

1. Add items
2. Check if an item **has not been added** (negatives are always true)

## How they work ##

Bloom filters hashes items passed. Since by nature hashes are irreversible and represented as a random string, it is not possible to access the content of the hashed item.

## Limitations ##

1. Can neither remove nor list items. 
2. You can’t tell with certainty, if an item has been added to the filter. (False possitives exist)

This is due to bloom filters' probabilistic nature, but false negatives are not possible. However, it is possible to extremely minimize false positives.

**However, these limitations comes with several of benefits:**
1. Fixed size: Will never grow, but chances of false positives increases over time.
2. Hash-based encryption
3. Quick lookups: involves far fewer operations than other methods, and can be cached.

## REDIS / NODE Bloom filter

I've used Redis and Node.js to illustrate a Bloom filter.

### Redis

Reason I'm using Redis is because:

1. it’s quick
2. in-memory
3. specific commands GETBIT, SETBIT that we will be using (indirectly).
4. Built in MD5-algorithm
5. And its.. just.. so.. easy to use..
