const Usuario = require('../models/Usuario');
const Proyecto = require('../models/Proyecto');
const Tarea = require('../models/Tarea');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: 'variables.env'})

// Crea y firma un Jsonwebtoken
const crearToken = (usuario, secreta, expiresIn) => {
  const {id, email, nombre} = usuario;
  return jwt.sign({id, email, nombre}, secreta, {expiresIn})
}

const resolvers = {
    Query: {
      obtenerProyectos: async (_, {}, ctx) => {
        const proyectos = Proyecto.find({creador: ctx.usuario.id});
        return proyectos;
      },
      obtenerTareas: async (_, {input}, ctx) => {
        const tareas = Tarea.find({creador: ctx.usuario.id}).where('proyecto').equals(input.proyecto);
        return tareas;
      }
        
    },
    Mutation: {
        crearUsuario: async (_, {input}, ctx) => {
          const { nombre, email, password } = input;

          const existeUsuario = await Usuario.findOne({email});

          if (existeUsuario) {
            throw new Error('El usuario ya está registrado');
          }

          try {
            // Hashear password
            const salt = await bcryptjs.genSalt(10);
            input.password = await bcryptjs.hash(password, salt);

            // Registrar nuevo usuario
            const nuevoUsuario = new Usuario(input);
            nuevoUsuario.save();
            return "Usuario creado correctamente";
          } catch (error) {
            console.log(error);
          }
        },
        autenticarUsuario: async (_, {input}, ctx) => {
          const { email, password } = input;

          // Revisar si el usuario existe
          const usuario = await Usuario.findOne({email});

          if (!usuario) {
            throw new Error('El usuario no está registrado');
          }

          // Revisar si el password es correcto
          const passwordCorrecto = await bcryptjs.compare(password, usuario.password)
          if (!passwordCorrecto) {
            throw new Error('La password no es correcta');
          }

          // Dar acceso
          return {
            token: crearToken(usuario, process.env.SECRETA, '4hr')
          }
        },
        nuevoProyecto: async (_, {input}, ctx) => {
          
          try {
            // Registrar nuevo proyecto
            const proyecto = new Proyecto(input);
            // Asociar el creador
            proyecto.creador = ctx.usuario.id;
            // Almacenarlo en la BD
            const resultado = await proyecto.save();
            return resultado;
          } catch (error) {
            console.log(error);
          }
        },
        actualizarProyecto: async (_, {id, input}, ctx) => {

          // Revisar si el proyecto existe
          let proyecto = await Proyecto.findById(id);

          if (!proyecto) {
            throw new Error('El proyecto no existe');
          }

          // Revisar si el creador es el mismo usuario que el logado
          if (proyecto.creador.toString() !== ctx.usuario.id) {
            throw new Error('No puedes modificar el proyecto porque no eres el creador');
          }

          // Actualizar en base de datos
          proyecto = await Proyecto.findOneAndUpdate({ _id: id}, input, {new: true});
          return proyecto;          
        },
        eliminarProyecto: async (_, {id}, ctx) => {

          // Revisar si el proyecto existe
          let proyecto = await Proyecto.findById(id);

          if (!proyecto) {
            throw new Error('El proyecto no existe');
          }

          // Revisar si el creador es el mismo usuario que el logado
          if (proyecto.creador.toString() !== ctx.usuario.id) {
            throw new Error('No puedes eliminar el proyecto porque no eres el creador');
          }

          // Eliminar en base de datos
          await Proyecto.findOneAndDelete({ _id: id});
          return "Proyecto eliminado";          
        },
        nuevaTarea: async (_, {input}, ctx) => {
          
          try {
            // Registrar nueva tarea
            const tarea = new Tarea(input);
            // Asociar el creador
            tarea.creador = ctx.usuario.id;
            // Almacenarlo en la BD
            const resultado = await tarea.save();
            return resultado;
          } catch (error) {
            console.log(error);
          }
        },
        actualizarTarea: async (_, {id, input, estado}, ctx) => {

          // Revisar si la tarea existe
          let tarea = await Tarea.findById(id);

          if (!tarea) {
            throw new Error('La tarea no existe');
          }

          // Revisar si la persona que edita es el propietario
          if (tarea.creador.toString() !== ctx.usuario.id) {
            throw new Error('No puedes modificar la tarea porque no eres el propietario');
          }

          // Asignamos el estado
          input.estado = estado;

          // Guardar la tarea
          tarea = await Tarea.findOneAndUpdate({ _id: id}, input, {new: true});
          return tarea;   
        },
        eliminarTarea: async (_, {id}, ctx) => {

          // Revisar si la tarea existe
          let tarea = await Tarea.findById(id);

          if (!tarea) {
            throw new Error('La tarea no existe');
          }

          // Revisar si el creador es el mismo usuario que el logado
          if (tarea.creador.toString() !== ctx.usuario.id) {
            throw new Error('No puedes eliminar la tarea porque no eres el creador');
          }

          // Eliminar en base de datos
          await Tarea.findOneAndDelete({ _id: id});
          return "Tarea eliminada";          
        }
    }
};

module.exports = resolvers;