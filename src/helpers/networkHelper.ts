export function getNetworkById(networkId: number): string {
  switch (networkId) {
    case 1:
      return 'mainnet'
    case 2:
      return 'morden'
    case 3:
      return 'ropsten'
    case 4:
      return 'rinkeby'
    case 42:
      return 'kovan'
    default:
      return 'unknown'
  }
}
