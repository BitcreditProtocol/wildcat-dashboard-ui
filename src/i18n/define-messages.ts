import type { MessageDescriptor } from "react-intl";

/**
 * Message descriptors without typed values, as react-intl 10 returned them from `defineMessages`.
 *
 * react-intl 12 types every descriptor from its `defineMessages` as taking no values unless the
 * values are declared in a type argument. The AI Credit operator screens pass values to
 * descriptors they define untyped, so they import this one instead. formatjs extracts by the
 * function name, so these messages still reach `source.json`.
 */
export function defineMessages<K extends PropertyKey, T = MessageDescriptor, U extends Record<K, T> = Record<K, T>>(messages: U): U {
  return messages;
}
