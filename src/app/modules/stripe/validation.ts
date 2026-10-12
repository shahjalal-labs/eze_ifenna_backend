import { z } from "zod";

enum SubscriptionTitleType {
  Premium_member_bundle = "Premium_member_bundle",
  Extend_club_duration = "Extend_club_duration",
  Audio_calling_480_minutes_per_month = "Audio_calling_480_minutes_per_month",
  Create_groups_and_group_invites = "Create_groups_and_group_invites",
  Ability_to_join_3_active_Clubs_3_club_limit = "Ability_to_join_3_active_Clubs_3_club_limit",
  No_ads = "No_ads",
}

const subscriptionSchema = z.object({
  name: z.string().min(3, "Plan name must be at least 3 characters long"),
  amount: z.number().positive("Amount must be a positive number"),
  type: z.enum(["subscription", "one-time"], {
    errorMap: () => ({ message: "Type must be 'subscription' or 'one-time'" }),
  }),
  subscriptionTitleType: z.nativeEnum(SubscriptionTitleType, {
    errorMap: () => ({ message: "Invalid subscription title type" }),
  }),
  features: z.object({}),
});

export { subscriptionSchema };
