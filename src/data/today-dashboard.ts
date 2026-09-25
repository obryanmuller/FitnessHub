import type { TodayDashboard } from "@/types/daily-routine";

export const todayDashboardMock: TodayDashboard = {
  water: {
    consumedMl: 750,
    goalMl: 3000,
  },
  workout: {
    label: "Musculação",
    routineItemId: "workout-gym",
  },
  weight: {
    lastKg: 105,
  },
  routine: [
    {
      id: "pre-workout",
      time: "05:30",
      title: "Pré-treino",
      entries: ["Banana", "Café"],
      completed: false,
    },
    {
      id: "workout-gym",
      time: "06:00",
      title: "Academia",
      entries: ["Musculação"],
      completed: false,
    },
    {
      id: "breakfast",
      time: "07:15",
      title: "Café da manhã / pós-treino",
      entries: ["Tapioca 60 g", "3 ovos", "Café com leite"],
      completed: false,
    },
    {
      id: "optional-morning-snack",
      time: "10:00",
      title: "Lanche opcional",
      entries: ["Fruta"],
      completed: false,
    },
    {
      id: "lunch",
      time: "13:00",
      title: "Almoço",
      entries: ["Arroz", "Feijão", "Frango", "Salada/legumes"],
      completed: false,
    },
    {
      id: "afternoon-snack",
      time: "16:00",
      title: "Lanche da tarde",
      entries: ["Iogurte + fruta", "OU", "2 ovos + fruta"],
      completed: false,
    },
    {
      id: "dinner",
      time: "20:00",
      title: "Jantar",
      entries: ["Proteína", "Arroz", "Feijão", "Salada/legumes"],
      completed: false,
    },
    {
      id: "optional-supper",
      time: "22:00",
      title: "Ceia opcional",
      entries: ["Iogurte ou fruta"],
      completed: false,
    },
  ],
  navigation: [
    {
      label: "Hoje",
      icon: "home",
      href: "/",
      active: true,
    },
    {
      label: "Alimentação",
      icon: "meals",
      href: "#",
      disabled: true,
    },
    {
      label: "Treinos",
      icon: "workouts",
      href: "#",
      disabled: true,
    },
    {
      label: "Progresso",
      icon: "progress",
      href: "#",
      disabled: true,
    },
    {
      label: "Perfil",
      icon: "profile",
      href: "#",
      disabled: true,
    },
  ],
};
