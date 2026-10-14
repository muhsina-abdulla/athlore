import { Button, StackScreen, Txt } from '@/components/ui';

export default function LogSessionScreen() {
  // TODO: the log form (category, focus, duration, session types, details,
  // exercises) with draft autosave, once the local database exists.
  return (
    <StackScreen
      title="Log session"
      closeIcon
      footer={<Button title="Save session" disabled />}
    >
      <Txt variant="body" color="textSecondary">
        The session form is coming next.
      </Txt>
    </StackScreen>
  );
}
