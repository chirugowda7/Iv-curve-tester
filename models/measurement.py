from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Measurement(db.Model):

    id = db.Column(db.Integer, primary_key=True)

    voc = db.Column(db.Float)
    isc = db.Column(db.Float)
    vmp = db.Column(db.Float)
    imp = db.Column(db.Float)
    pmax = db.Column(db.Float)

    def __init__(self, **kwargs):
        super(Measurement, self).__init__(**kwargs)

    def __repr__(self):
        return f"<Measurement {self.id}>"