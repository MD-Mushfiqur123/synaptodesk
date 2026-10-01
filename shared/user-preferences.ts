export type MessageListEmphasis = "agent" | "thread";

export type UserPreferences = {
  messageListEmphasis: MessageListEmphasis;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  messageListEmphasis: "thread",
};
