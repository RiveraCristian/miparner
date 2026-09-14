import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  /*
   * Administrador inicial.
   *
   * Las credenciales vienen del entorno, NUNCA del código: este repositorio es
   * público, así que una contraseña escrita aquí sería una contraseña conocida
   * por cualquiera en un servidor expuesto a internet.
   *
   * En producción son obligatorias. En local hay un valor por defecto para no
   * estorbar, y ahí da igual porque la base no sale de tu máquina.
   */
  const adminCorreo = process.env.SEED_ADMIN_CORREO ?? "admin@miparner.cl";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (process.env.NODE_ENV === "production" && !adminPassword) {
    throw new Error(
      "Falta SEED_ADMIN_PASSWORD. En producción el administrador no puede " +
        "crearse con una contraseña escrita en el código.",
    );
  }

  const admin = await prisma.usuario.upsert({
    where: { usuarioCorreo: adminCorreo },
    // Reejecutar el seed repone la contraseña: sirve para recuperar el acceso
    // si se pierde, cambiando el secreto y relanzando el despliegue.
    update: {
      usuarioEstadoValidacion: "aprobado",
      usuarioActivo: true,
      ...(adminPassword ? { usuarioPassword: await bcrypt.hash(adminPassword, 12) } : {}),
    },
    create: {
      usuarioCorreo: adminCorreo,
      usuarioNombre: "Administrador Miparner",
      usuarioPassword: await bcrypt.hash(adminPassword ?? "Cambiar123!", 12),
      usuarioRol: "admin",
      // El equipo de administración no pasa por la cola de validación.
      usuarioEstadoValidacion: "aprobado",
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
    { nombre: "Kit deportivo Miparner", costo: 1000, stock: 25 },
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
