const { Appointment, Patient, Doctor } = require('../models');
const { emitEvent } = require('../events/eventBus');
const { EVENTS } = require('../events/eventTypes');

async function createAppointment(req, res) {
  try {
    const { patientId, doctorId, datetime, createdVia } = req.body;
    if (!patientId || !doctorId || !datetime) {
      return res.status(400).json({ error: 'patientId, doctorId, and datetime are required.' });
    }

    const parsedDatetime = new Date(datetime);
    if (Number.isNaN(parsedDatetime.getTime())) {
      return res.status(400).json({ error: 'datetime must be a valid ISO date string.' });
    }

    const [patient, doctor] = await Promise.all([
      Patient.findById(patientId).lean(),
      Doctor.findById(doctorId).lean(),
    ]);
    if (!patient) return res.status(404).json({ error: `Patient ${patientId} not found.` });
    if (!doctor) return res.status(404).json({ error: `Doctor ${doctorId} not found.` });

    const conflict = await Appointment.findOne({
      doctorId,
      datetime: parsedDatetime,
      status: 'scheduled',
    }).lean();
    if (conflict) {
      return res.status(409).json({ error: `Doctor already has a scheduled appointment at this exact time (appointment ${conflict._id}).` });
    }

    const appointment = await Appointment.create({
      patientId,
      doctorId,
      datetime: parsedDatetime,
      createdVia: createdVia === 'whatsapp' ? 'whatsapp' : 'staff',
    });

    emitEvent(EVENTS.APPOINTMENT_CREATED, {
      appointmentId: String(appointment._id),
      patientId: String(appointment.patientId),
      doctorId: String(appointment.doctorId),
      datetime: appointment.datetime,
    });

    res.status(201).json({ appointment });
  } catch (err) {
    console.error('createAppointment error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function listAppointments(req, res) {
  try {
    const { patientId, doctorId, status, fromDate, toDate } = req.query;
    const query = {};
    if (patientId) query.patientId = patientId;
    if (doctorId) query.doctorId = doctorId;
    if (status) query.status = status;
    if (fromDate || toDate) {
      query.datetime = {};
      if (fromDate) query.datetime.$gte = new Date(fromDate);
      if (toDate) query.datetime.$lte = new Date(toDate);
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name phone')
      .populate('doctorId', 'name department')
      .sort({ datetime: 1 })
      .lean();

    res.json({ appointments });
  } catch (err) {
    console.error('listAppointments error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getAppointment(req, res) {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId', 'name phone')
      .populate('doctorId', 'name department')
      .lean();
    if (!appointment) return res.status(404).json({ error: 'Appointment not found.' });
    res.json({ appointment });
  } catch (err) {
    console.error('getAppointment error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function cancelAppointment(req, res) {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found.' });
    if (appointment.status !== 'scheduled') {
      return res.status(409).json({ error: `This appointment is already ${appointment.status} and cannot be cancelled.` });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    emitEvent(EVENTS.APPOINTMENT_CANCELLED, {
      appointmentId: String(appointment._id),
      patientId: String(appointment.patientId),
      datetime: appointment.datetime,
    });

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'name phone')
      .populate('doctorId', 'name department')
      .lean();

    res.json({ appointment: populatedAppointment });
  } catch (err) {
    console.error('cancelAppointment error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createAppointment, listAppointments, getAppointment, cancelAppointment };
