export function createMockCharacter<T extends Record<string, any>>(
  overrides: T = {} as T,
) {
  return {
    MemberNumber: 10001,
    Name: "Tester",
    LabelColor: "#ffffff",
    Description: "",
    Appearance: [],
    Effect: [],
    Ownership: null,
    Lovership: [],
    IsPlayer: () => false,
    IsOwnedByPlayer: () => false,
    IsOwner: () => false,
    IsLoverOfPlayer: () => false,
    IsFamilyOfPlayer: () => false,
    IsInFamilyOfMemberNumber: (_memberNum: number) => false,
    IsRestrained: () => false,
    IsBlind: () => false,
    IsDeaf: () => false,
    IsGagged: () => false,
    GetBlindLevel: () => 0,
    GetBlurLevel: () => 0,
    GetDeafLevel: () => 0,
    HasEffect: () => false,
    ...overrides,
  };
}
