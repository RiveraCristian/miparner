import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Administrador inicial (cambiar la contraseña tras el primer ingreso).
  const adminCorreo = "admin@rumbo.cl";
  const admin = await prisma.usuario.upsert({
    where: { usuarioCorreo: adminCorreo },
    update: {},
    create: {
      usuarioCorreo: adminCorreo,
      usuarioNombre: "Administrador Rumbo",
      usuarioPassword: await bcrypt.hash("Cambiar123!", 12),
      usuarioRol: "admin",
    },
  });

  // Catálogo base de insignias
  const insignias = [
    { codigo: "primer_viaje", nombre: "Primer viaje", descripcion: "Completaste tu primer viaje", icono: "flag" },
    { codigo: "diez_viajes", nombre: "10 viajes", descripcion: "Diez viajes completados", icono: "medal" },
    { codigo: "puntual", nombre: "Puntual", descripcion: "Cinco llegadas a tiempo seguidas", icono: "clock" },
    { codigo: "racha_7", nombre: "Racha 7", descripcion: "Siete días activos seguidos", icono: "flame" },
  ];
  for (const i of insignias) {
    await prisma.insignia.upsert({
      where: { insigniaCodigo: i.codigo },
      update: {},
      create: {
        insigniaCodigo: i.codigo,
        insigniaNombre: i.nombre,
        insigniaDescripcion: i.descripcion,
        insigniaIcono: i.icono,
        createdBy: admin.usuarioId,
      },
    });
  }

  // Catálogo base de premios
  const premios = [
    { nombre: "Kit deportivo Rumbo", costo: 1000, stock: 25 },
    { nombre: "Botella térmica", costo: 400, stock: 100 },
    { nombre: "Sesión de fisioterapia", costo: 1800, stock: 10 },
  ];
  const existentes = await prisma.premio.count();
  if (existentes === 0) {
    for (const p of premios) {
      await prisma.premio.create({
        data: {
          premioNombre: p.nombre,
          premioCostoPuntos: p.costo,
          premioStock: p.stock,
          createdBy: admin.usuarioId,
        },
      });
    }
  }

  console.log("Seed completado. Admin:", adminCorreo);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
