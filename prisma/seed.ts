import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminHash = await bcrypt.hash('Admin1234!', 12)
  const memberHash = await bcrypt.hash('Member1234!', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@zidny.ma' },
    update: {},
    create: {
      fullName: 'Admin Zidny',
      username: 'admin',
      email: 'admin@zidny.ma',
      passwordHash: adminHash,
      role: 'ADMIN',
      department: 'CEO',
    },
  })

  const members = await Promise.all([
    prisma.user.upsert({
      where: { email: 'ali@zidny.ma' },
      update: {},
      create: {
        fullName: 'Ali Benali',
        username: 'ali',
        email: 'ali@zidny.ma',
        passwordHash: memberHash,
        role: 'MEMBER',
        department: 'WEB',
      },
    }),
    prisma.user.upsert({
      where: { email: 'sara@zidny.ma' },
      update: {},
      create: {
        fullName: 'Sara Cherkaoui',
        username: 'sara',
        email: 'sara@zidny.ma',
        passwordHash: memberHash,
        role: 'MEMBER',
        department: 'DESIGN',
      },
    }),
    prisma.user.upsert({
      where: { email: 'youssef@zidny.ma' },
      update: {},
      create: {
        fullName: 'Youssef El Mansouri',
        username: 'youssef',
        email: 'youssef@zidny.ma',
        passwordHash: memberHash,
        role: 'MEMBER',
        department: 'MOBILE',
      },
    }),
  ])

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const task1 = await prisma.task.create({
    data: {
      title: 'Refonte du site web',
      description: 'Moderniser le design et améliorer les performances du site corporate.',
      deadline: nextWeek,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      departmentTags: JSON.stringify(['WEB', 'DESIGN']),
      createdById: admin.id,
      assignees: { create: [{ userId: members[0].id }, { userId: members[1].id }] },
      subtasks: {
        create: [
          { title: 'Analyse de l\'existant', isCompleted: true, order: 0 },
          { title: 'Wireframes', isCompleted: true, order: 1 },
          { title: 'Intégration HTML/CSS', isCompleted: false, order: 2 },
          { title: 'Tests et validation', isCompleted: false, order: 3 },
        ],
      },
    },
  })

  await prisma.task.create({
    data: {
      title: 'Campagne réseaux sociaux Q3',
      description: 'Préparer et programmer les publications pour le troisième trimestre.',
      deadline: tomorrow,
      status: 'TODO',
      priority: 'URGENT',
      departmentTags: JSON.stringify(['MARKETING']),
      createdById: admin.id,
      assignees: { create: [{ userId: members[1].id }] },
    },
  })

  await prisma.task.create({
    data: {
      title: 'Rapport financier mensuel',
      description: 'Consolider les chiffres du mois et préparer le rapport pour la direction.',
      deadline: yesterday,
      status: 'OVERDUE',
      priority: 'HIGH',
      departmentTags: JSON.stringify(['COMMERCIAL']),
      createdById: admin.id,
      assignees: { create: [{ userId: members[2].id }] },
    },
  })

  await prisma.task.create({
    data: {
      title: 'Prototype application mobile',
      description: 'Développer un prototype fonctionnel de l\'application mobile client.',
      deadline: nextWeek,
      status: 'TODO',
      priority: 'NORMAL',
      departmentTags: JSON.stringify(['MOBILE', 'RND']),
      createdById: members[0].id,
      assignees: { create: [{ userId: members[0].id }] },
    },
  })

  await prisma.task.create({
    data: {
      title: 'Tournage vidéo produit',
      description: 'Organiser et réaliser le tournage des vidéos promotionnelles.',
      deadline: nextWeek,
      status: 'DONE',
      priority: 'NORMAL',
      departmentTags: JSON.stringify(['FILMMAKING', 'MARKETING']),
      createdById: admin.id,
      completedAt: new Date(),
      assignees: { create: [{ userId: members[1].id }] },
    },
  })

  console.log('✅ Base de données initialisée avec succès')
  console.log(`   Admin: admin@zidny.ma / Admin1234!`)
  console.log(`   Membres: *@zidny.ma / Member1234!`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
