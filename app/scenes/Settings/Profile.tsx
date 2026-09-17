import { observer } from "mobx-react";
import { ProfileIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import InputLarge from "~/components/InputLarge";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import { UserChangeEmailDialog } from "~/components/UserDialogs";
import env from "~/env";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import { UserValidation } from "@shared/validations";
import ImageInput from "./components/ImageInput";
import SettingRow from "./components/SettingRow";

const Profile = () => {
  const user = useCurrentUser();
  const { dialogs } = useStores();
  const form = React.useRef<HTMLFormElement>(null);
  const [name, setName] = React.useState<string>(user.name);
  const [password, setPassword] = React.useState("");
  const { t } = useTranslation();

  const handleSubmit = async (ev: React.SyntheticEvent) => {
    ev.preventDefault();

    try {
      await user.save({ name });
      toast.success(t("Profile saved"));
    } catch (err) {
      toast.error(errToString(err));
    }
  };

  const handleChangeEmail = () => {
    dialogs.openModal({
      title: t("Change email"),
      content: (
        <UserChangeEmailDialog user={user} onSubmit={dialogs.closeAllModals} />
      ),
    });
  };

  const handleNameChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setName(ev.target.value);
  };

  const handleAvatarChange = async (avatarUrl: string) => {
    await user.save({ avatarUrl });
    toast.success(t("Profile picture updated"));
  };

  const handleAvatarError = (error: string | null | undefined) => {
    toast.error(error || t("Unable to upload new profile picture"));
  };

  const handleSetPassword = async (event: React.SyntheticEvent) => {
    event.preventDefault();

    try {
      await client.post("/users.setPassword", { password });
      setPassword("");
      toast.success(t("Password saved"));
    } catch (err) {
      toast.error(errToString(err));
    }
  };

  const isValid = form.current?.checkValidity();
  const { isSaving } = user;

  return (
    <Scene title={t("Profile")} icon={<ProfileIcon />}>
      <Heading>{t("Profile")}</Heading>
      <Text as="p" type="secondary">
        <Trans>Manage how you appear to other members of the workspace.</Trans>
      </Text>

      <form onSubmit={handleSubmit} ref={form}>
        <SettingRow
          label={t("Photo")}
          name="avatarUrl"
          description={t("Choose a photo or image to represent yourself.")}
        >
          <ImageInput
            alt={t("Profile picture")}
            onSuccess={handleAvatarChange}
            onError={handleAvatarError}
            model={user}
          />
        </SettingRow>
        <SettingRow
          border={env.EMAIL_ENABLED}
          label={t("Name")}
          name="name"
          description={t(
            "This could be your real name, or a nickname — however you’d like people to refer to you."
          )}
        >
          <Input
            id="name"
            autoComplete="name"
            value={name}
            onChange={handleNameChange}
            maxLength={UserValidation.maxNameLength}
            showCharacterCount
            required
          />
        </SettingRow>

        {env.EMAIL_ENABLED && (
          <SettingRow border={false} label={t("Email address")} name="email">
            <Input
              type="email"
              value={user.email}
              readOnly
              onClick={handleChangeEmail}
            />
          </SettingRow>
        )}

        <Button type="submit" disabled={isSaving || !isValid}>
          {isSaving ? `${t("Saving")}…` : t("Save")}
        </Button>
      </form>

      <Heading as="h2">{t("Password")}</Heading>
      <Text as="p" type="secondary">
        {t(
          "Use at least 12 characters. Keep email sign-in enabled for recovery."
        )}
      </Text>
      <form onSubmit={handleSetPassword}>
        <InputLarge
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          placeholder={t("New password")}
          required
        />
        <Button type="submit" disabled={password.length < 12}>
          {t("Save password")}
        </Button>
      </form>
    </Scene>
  );
};

export default observer(Profile);
