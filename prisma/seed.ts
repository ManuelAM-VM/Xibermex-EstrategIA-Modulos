import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Crear colaboradores
  const victor = await prisma.colaborador.upsert({
    where: { email: 'victor@strategia.com' },
    update: {},
    create: {
      nombre: 'Victor Manuel Arredondo',
      email: 'victor@strategia.com',
    },
  })

  const oscar = await prisma.colaborador.upsert({
    where: { email: 'oscar@strategia.com' },
    update: {},
    create: {
      nombre: 'Oscar M. Navarro',
      email: 'oscar@strategia.com',
    },
  })

  // Crear proyecto
  const proyecto = await prisma.proyecto.upsert({
    where: { nombre: 'EstrategIA' },
    update: {},
    create: {
      nombre: 'EstrategIA',
    },
  })

  // Configuración inicial
  await prisma.configuracion.upsert({
    where: { clave: 'tarifa_dia' },
    update: {},
    create: { clave: 'tarifa_dia', valor: '500' },
  })

  await prisma.configuracion.upsert({
    where: { clave: 'horas_dia' },
    update: {},
    create: { clave: 'horas_dia', valor: '4' },
  })

  await prisma.configuracion.upsert({
    where: { clave: 'anthropic_api_key' },
    update: {},
    create: { clave: 'anthropic_api_key', valor: '' },
  })

  console.log('Seed completado:', { victor: victor.nombre, oscar: oscar.nombre, proyecto: proyecto.nombre })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
