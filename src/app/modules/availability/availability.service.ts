import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import customParseFormat from "dayjs/plugin/customParseFormat";
import advancedFormat from "dayjs/plugin/advancedFormat";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import { isOverlap } from "../../../helpers/overlap";

dayjs.extend(isSameOrBefore);
dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);

interface SlotInput {
  startTime: string;
  endTime: string;
}
interface AvailabilityInput {
  dayOfWeek: number;
  slots: SlotInput[];
}

function parseSlotToTime(time: string) {
  return dayjs(time, "hh:mm A").format("hh:mm A");
}

const createUserAvailability = async (
  providerId: string,
  availability: AvailabilityInput[]
) => {
  return prisma.$transaction(
    async (tx) => {
      await tx.availability.deleteMany({ where: { providerId } });

      const results = [];
      for (const day of availability) {
        const result = await tx.availability.create({
          data: {
            providerId,
            dayOfWeek: day.dayOfWeek,
            slots: {
              create: day.slots.map((s) => ({
                startTime: parseSlotToTime(s.startTime),
                endTime: parseSlotToTime(s.endTime),
              })),
            },
          },
        });
        results.push(result);
      }

      return results;
    },
    { timeout: 20000 }
  );
};

// const getExpertDayWiseSlotsFromDB = async (
//   providerId: string,
//   dayOfWeek: number
// ) => {
//   const availabilities = await prisma.availability.findMany({
//     where: { providerId, dayOfWeek },
//     include: { slots: true },
//   });

//   if (!availabilities.length) return [];

//   const now = dayjs();
//   const todayDayOfWeek = now.day();
//   const dayDifference = (dayOfWeek - todayDayOfWeek + 7) % 7;
//   const targetDate = dayjs(now).add(dayDifference, "day").startOf("day");

//   const result: { start: string; end: string }[] = [];

//   for (const availability of availabilities) {
//     for (const slot of availability.slots) {
//       const slotStartTime = dayjs(slot.startTime, "hh:mm A");
//       const slotEndTime = dayjs(slot.endTime, "hh:mm A");

//       if (!slotStartTime.isValid() || !slotEndTime.isValid()) {
//         console.log("Invalid slot time in DB", slot);
//         continue;
//       }

//       let start = targetDate
//         .hour(slotStartTime.hour())
//         .minute(slotStartTime.minute())
//         .second(0);
//       const end = targetDate
//         .hour(slotEndTime.hour())
//         .minute(slotEndTime.minute())
//         .second(0);

//       while (start.isBefore(end)) {
//         const slotStartDate = start;
//         const slotEndDate = start.add(30, "minute");

//         if (slotEndDate.isAfter(now)) {
//           result.push({
//             start: slotStartDate.format("hh:mm A"),
//             end: slotEndDate.format("hh:mm A"),
//           });
//         }

//         start = start.add(30, "minute");
//       }
//     }
//   }

//   return result;
// };
const getExpertDayWiseSlotsFromDB = async (userId: string, dayOfWeek: number) => {
  const availabilities = await prisma.availability.findMany({
    where: { providerId: userId, dayOfWeek },
    include: { slots: true },
  });

  if (!availabilities.length) return [];

  const now = dayjs();
  const today = now.day();
  const diff = (dayOfWeek - today + 7) % 7;

  const targetDate = now.add(diff, "day").startOf("day");
  const targetDateStr = targetDate.format("YYYY-MM-DD");

  // ----------------------------------------------------------------------
  // 1️⃣ FIXED: Correct UTC-safe date-range filtering (no exact matching!)
  // ----------------------------------------------------------------------
  const bookings = await prisma.booking.findMany({
    where: {
      providerId: userId,
      date: {
        gte: targetDate.startOf("day").toDate(),
        lt: targetDate.endOf("day").toDate(),
      },
    },
  });

  // Convert bookings → 30 min ranges
  const bookedRanges = bookings.map((b: any) => {
    const start = dayjs(`${targetDateStr} ${b.time}`, "YYYY-MM-DD hh:mm A");
    return { start, end: start.add(60, "minute") };
  });

  // ----------------------------------------------------------------------
  // 2️⃣ Build free 30-minute slots from availability
  // ----------------------------------------------------------------------
  const freeSlots: { start: string; end: string }[] = [];

  for (const availability of availabilities) {
    for (const slot of availability.slots) {
      const parsedStart = dayjs(slot.startTime, "hh:mm A");
      const parsedEnd = dayjs(slot.endTime, "hh:mm A");

      if (!parsedStart.isValid() || !parsedEnd.isValid()) continue;

      let cursor = targetDate
        .hour(parsedStart.hour())
        .minute(parsedStart.minute())
        .second(0);

      const slotEnd = targetDate
        .hour(parsedEnd.hour())
        .minute(parsedEnd.minute())
        .second(0);

      while (cursor.isBefore(slotEnd)) {
        const blockStart = cursor;
        const blockEnd = cursor.add(60, "minute");

        // Skip past blocks for today
        if (diff === 0 && blockEnd.isBefore(now)) {
          cursor = cursor.add(60, "minute");
          continue;
        }

        // Check overlap
        const isBooked = bookedRanges.some(
          (br) =>
            blockStart.isBefore(br.end) && blockEnd.isAfter(br.start)
        );

        if (!isBooked) {
          freeSlots.push({
            start: blockStart.format("hh:mm A"),
            end: blockEnd.format("hh:mm A"),
          });
        }

        cursor = cursor.add(60, "minute");
      }
    }
  }

  return freeSlots;
};


const getExpertsAllSlotsFromDB = async (providerId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: providerId, role: "PROVIDER" },
  });

  const availabilities = await prisma.availability.findMany({
    where: { providerId },
    select: {
      id: true,
      dayOfWeek: true,
      slots: {
        select: { id: true, startTime: true, endTime: true },
      },
    },
  });

  const organized = availabilities.reduce((acc: any, curr) => {
    const dayIndex = acc.findIndex((d: any) => d.dayOfWeek === curr.dayOfWeek);

    const slotsWithAvailabilityId = curr.slots.map((slot) => ({
      ...slot,
      availabilityId: curr.id,
    }));

    if (dayIndex > -1) {
      acc[dayIndex].slots.push(...slotsWithAvailabilityId);
    } else {
      acc.push({
        dayOfWeek: curr.dayOfWeek,
        slots: slotsWithAvailabilityId,
      });
    }
    return acc;
  }, []);

  return organized;
};

const getUserAvailabilityFromDB = async (providerId: string) => {
  const availability = await prisma.availability.findMany({
    where: { providerId },
    include: { slots: true },
    orderBy: { dayOfWeek: "asc" },
  });

  return availability.map((day) => ({
    dayOfWeek: day.dayOfWeek,
    slots: day.slots.map((s) => ({
      startTime: dayjs(s.startTime, "HH:mm").format("hh:mm A"),
      endTime: dayjs(s.endTime, "HH:mm").format("hh:mm A"),
    })),
  }));
};

const deleteSlotFromDB = async (id: string) => {
  const slot = await prisma.availability.findUniqueOrThrow({
    where: { id },
  });
  // const expertsDaySlotCount = await prisma.availability.count({
  //   where: { providerId: slot.providerId, dayOfWeek: slot.dayOfWeek },
  // });

  // if (expertsDaySlotCount < 2) {
  //   throw new ApiError(
  //     400,
  //     "This slot cannot be deleted. At least one slots must remain for this day."
  //   );
  // }
  await prisma.availability.delete({
    where: { id },
  });
  return;
};

const updateSlotFromDB = async (id: string, payload: SlotInput) => {
  const slot = await prisma.availableSlot.findUniqueOrThrow({
    where: { id },
    include: {
      availability: true,
    },
  });

  const currentSlots = await prisma.availability.findMany({
    where: {
      dayOfWeek: slot.availability.dayOfWeek,
      providerId: slot.availability.providerId,
    },
    include: {
      slots: {
        select: { id: true, startTime: true, endTime: true },
      },
    },
  });

  const allSlots = currentSlots.flatMap((a) => a.slots);

  for (const existing of allSlots) {
    if (existing.id === id) continue;

    if (
      isOverlap(
        payload.startTime,
        payload.endTime,
        existing.startTime,
        existing.endTime
      )
    ) {
      throw new Error(
        `Time conflict: overlaps with existing slot ${existing.startTime} - ${existing.endTime}`
      );
    }
  }

  await prisma.availableSlot.update({
    where: { id },
    data: {
      startTime: payload.startTime,
      endTime: payload.endTime,
    },
  });

  return;
};

const addNewSlotIntoDB = async (providerId: string, payload: any) => {
  return await prisma.$transaction(async (tx) => {
    await tx.user.findUniqueOrThrow({
      where: { id: providerId, role: "PROVIDER" },
    });

    const availabilities = await tx.availability.findMany({
      where: {
        providerId,
        dayOfWeek: payload.dayOfWeek,
      },
      include: { slots: true },
    });
    for (const availability of availabilities) {
      for (const existing of availability.slots) {
        if (
          isOverlap(
            payload.startTime,
            payload.endTime,
            existing.startTime,
            existing.endTime
          )
        ) {
          throw new ApiError(
            400,
            `Time conflict: overlaps with existing slot ${existing.startTime} - ${existing.endTime}`
          );
        }
      }
    }

    const availabilityForNewSlot = await tx.availability.create({
      data: {
        dayOfWeek: payload.dayOfWeek,
        providerId,
      },
      include: { slots: true },
    });

    await tx.availableSlot.create({
      data: {
        startTime: payload.startTime,
        endTime: payload.endTime,
        availabilityId: availabilityForNewSlot.id,
      },
    });

    return;
  });
};

export const availabilityServices = {
  createUserAvailability,
  addNewSlotIntoDB,
  getUserAvailabilityFromDB,
  getExpertDayWiseSlotsFromDB,
  updateSlotFromDB,
  deleteSlotFromDB,
  getExpertsAllSlotsFromDB,
};


