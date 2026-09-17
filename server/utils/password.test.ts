import { hashPassword, verifyPassword } from "./password";

it("verifies only the password used to create a digest", async () => {
  const digest = await hashPassword("correct horse battery staple");

  await expect(verifyPassword("correct horse battery staple", digest)).resolves.toBe(true);
  await expect(verifyPassword("wrong password", digest)).resolves.toBe(false);
});
